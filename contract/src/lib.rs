//! Hive: a NEAR contract for hiring a swarm of AI agents.
//!
//! - A poster attaches NEAR to `post_job`; the reward is held in escrow.
//! - An agent joins with `enroll`, attaching NEAR as fuel. Each submission burns a fixed inference fee
//!   from that fuel, which is credited to the operator who pays for NEAR AI inference.
//! - Only the registered reviewer can call `review`. Answers scoring at least `PASS_SCORE` share the
//!   reward in proportion to their score; whatever is not earned goes back to the poster.
//! - If a job is never reviewed, the poster can take the full reward back after its deadline.
//! - Nothing is pushed out directly. Every payout lands in a balance its owner withdraws with
//!   `withdraw`, so a failed transfer can never leave the books in the wrong state.

use near_sdk::json_types::U128;
use near_sdk::store::{IterableMap, LookupMap};
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise};

pub const PASS_SCORE: u8 = 70;
const MIN_REWARD: u128 = NearToken::from_millinear(10).as_yoctonear(); // 0.01 NEAR
const MIN_FUEL: u128 = NearToken::from_millinear(10).as_yoctonear();
const MAX_SUBMISSIONS: usize = 10;
const GAS_ON_WITHDRAW: Gas = Gas::from_tgas(5);

#[near(serializers = [json, borsh])]
#[derive(Clone, PartialEq, Debug)]
pub enum JobStatus {
    Open,
    Settled,
    Refunded,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Submission {
    pub agent: AccountId,
    /// SHA-256 of the answer text. The text itself stays off-chain.
    pub answer_hash: String,
    /// SHA-256 of the signed TEE response that produced the answer.
    pub attestation_ref: String,
    pub score: Option<u8>,
    pub payout: U128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Job {
    pub id: u64,
    pub poster: AccountId,
    pub brief_hash: String,
    pub reward: U128,
    pub deadline: u64,
    pub status: JobStatus,
    pub submissions: Vec<Submission>,
    /// SHA-256 of the reviewer's signed verdicts, recorded when the job is settled.
    pub review_ref: Option<String>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Agent {
    pub name: String,
    pub fuel: U128,
    pub jobs_done: u32,
    pub jobs_paid: u32,
}

#[near(serializers = [json])]
pub struct Score {
    pub agent: AccountId,
    pub score: u8,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Hive {
    owner: AccountId,
    reviewer: AccountId,
    operator: AccountId,
    inference_fee: u128,
    jobs: IterableMap<u64, Job>,
    agents: IterableMap<AccountId, Agent>,
    balances: LookupMap<AccountId, u128>,
    next_job: u64,
}

#[near]
impl Hive {
    #[init]
    pub fn new(owner: AccountId, reviewer: AccountId, operator: AccountId, inference_fee: U128) -> Self {
        Self {
            owner,
            reviewer,
            operator,
            inference_fee: inference_fee.0,
            jobs: IterableMap::new(b"j"),
            agents: IterableMap::new(b"a"),
            balances: LookupMap::new(b"b"),
            next_job: 0,
        }
    }

    // ---------- posters ----------

    /// Post a job. The attached deposit is the reward, held until the job is reviewed or refunded.
    #[payable]
    pub fn post_job(&mut self, brief_hash: String, deadline: u64) -> u64 {
        let reward = env::attached_deposit().as_yoctonear();
        require!(reward >= MIN_REWARD, "attach at least 0.01 NEAR as the reward");
        require_hash(&brief_hash, "brief_hash");
        require!(deadline > env::block_timestamp(), "deadline must be in the future");

        let id = self.next_job;
        self.next_job += 1;
        self.jobs.insert(id, Job {
            id,
            poster: env::predecessor_account_id(),
            brief_hash,
            reward: U128(reward),
            deadline,
            status: JobStatus::Open,
            submissions: Vec::new(),
            review_ref: None,
        });
        log_event("job_posted", id);
        id
    }

    /// Take the whole reward back from a job nobody reviewed before its deadline.
    pub fn refund(&mut self, job_id: u64) {
        let mut job = self.open_job(job_id);
        require!(env::predecessor_account_id() == job.poster, "only the poster can ask for a refund");
        require!(env::block_timestamp() > job.deadline, "the job is still running");
        job.status = JobStatus::Refunded;
        self.credit(&job.poster, job.reward.0);
        self.jobs.insert(job_id, job);
        log_event("job_refunded", job_id);
    }

    // ---------- agents ----------

    /// Join the swarm, or add fuel. The deposit pays for this agent's inference.
    #[payable]
    pub fn enroll(&mut self, name: String) {
        let deposit = env::attached_deposit().as_yoctonear();
        require!(deposit >= MIN_FUEL, "attach at least 0.01 NEAR as fuel");
        let id = env::predecessor_account_id();
        let mut agent = self.agents.get(&id).cloned().unwrap_or(Agent { name: name.clone(), fuel: U128(0), jobs_done: 0, jobs_paid: 0 });
        agent.name = name;
        agent.fuel = U128(agent.fuel.0 + deposit);
        self.agents.insert(id, agent);
    }

    /// Submit an answer. Burns one inference fee from the agent's fuel.
    pub fn submit(&mut self, job_id: u64, answer_hash: String, attestation_ref: String) {
        let agent_id = env::predecessor_account_id();
        let mut agent = self.agents.get(&agent_id).cloned().expect("enroll before submitting");
        let mut job = self.open_job(job_id);
        require!(env::block_timestamp() <= job.deadline, "the job has closed");
        require!(job.submissions.len() < MAX_SUBMISSIONS, "this job has enough submissions");
        require!(job.submissions.iter().all(|s| s.agent != agent_id), "one submission per agent");
        require_hash(&answer_hash, "answer_hash");
        require_hash(&attestation_ref, "attestation_ref");
        require!(agent.fuel.0 >= self.inference_fee, "not enough fuel; enroll again to top up");

        agent.fuel = U128(agent.fuel.0 - self.inference_fee);
        agent.jobs_done += 1;
        let operator = self.operator.clone();
        self.credit(&operator, self.inference_fee);
        job.submissions.push(Submission { agent: agent_id.clone(), answer_hash, attestation_ref, score: None, payout: U128(0) });
        self.agents.insert(agent_id, agent);
        self.jobs.insert(job_id, job);
    }

    // ---------- reviewer ----------

    /// Record the reviewer's scores and settle the job in one step.
    pub fn review(&mut self, job_id: u64, scores: Vec<Score>, review_ref: String) {
        require!(env::predecessor_account_id() == self.reviewer, "only the reviewer can review");
        require_hash(&review_ref, "review_ref");
        let mut job = self.open_job(job_id);

        for s in &scores {
            require!(s.score <= 100, "scores run from 0 to 100");
            let sub = job.submissions.iter_mut().find(|sub| sub.agent == s.agent).expect("score for an agent that did not submit");
            sub.score = Some(s.score);
        }

        let passing: u128 = job.submissions.iter().filter_map(|s| s.score.filter(|v| *v >= PASS_SCORE)).map(u128::from).sum();
        let mut paid = 0u128;
        for sub in job.submissions.iter_mut() {
            let score = sub.score.unwrap_or(0);
            if score >= PASS_SCORE && passing > 0 {
                let share = job.reward.0 * u128::from(score) / passing;
                sub.payout = U128(share);
                paid += share;
            }
        }

        for sub in job.submissions.clone() {
            if sub.payout.0 > 0 {
                self.credit(&sub.agent, sub.payout.0);
                if let Some(mut agent) = self.agents.get(&sub.agent).cloned() {
                    agent.jobs_paid += 1;
                    self.agents.insert(sub.agent.clone(), agent);
                }
            }
        }
        let poster = job.poster.clone();
        self.credit(&poster, job.reward.0 - paid);

        job.status = JobStatus::Settled;
        job.review_ref = Some(review_ref);
        self.jobs.insert(job_id, job);
        log_event("job_settled", job_id);
    }

    // ---------- everyone ----------

    /// Withdraw everything owed to the caller: payouts, refunds or inference fees.
    pub fn withdraw(&mut self) -> Promise {
        let id = env::predecessor_account_id();
        let amount = self.balances.remove(&id).unwrap_or(0);
        require!(amount > 0, "nothing to withdraw");
        Promise::new(id.clone())
            .transfer(NearToken::from_yoctonear(amount))
            .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_WITHDRAW).on_withdraw(id, U128(amount)))
    }

    /// If the transfer did not go through, put the money back so it can be withdrawn again.
    #[private]
    pub fn on_withdraw(&mut self, account: AccountId, amount: U128) {
        if env::promise_result_checked(0, 0).is_err() {
            self.credit(&account, amount.0);
        }
    }

    pub fn set_reviewer(&mut self, reviewer: AccountId) {
        require!(env::predecessor_account_id() == self.owner, "only the owner");
        self.reviewer = reviewer;
    }

    // ---------- views ----------

    pub fn get_job(&self, job_id: u64) -> Option<Job> {
        self.jobs.get(&job_id).cloned()
    }

    pub fn get_jobs(&self, from: Option<u64>, limit: Option<u64>) -> Vec<Job> {
        let from = from.unwrap_or(0);
        (from..self.next_job.min(from + limit.unwrap_or(20))).filter_map(|i| self.jobs.get(&i).cloned()).collect()
    }

    pub fn get_agent(&self, account_id: AccountId) -> Option<Agent> {
        self.agents.get(&account_id).cloned()
    }

    pub fn get_balance(&self, account_id: AccountId) -> U128 {
        U128(self.balances.get(&account_id).copied().unwrap_or(0))
    }

    pub fn get_config(&self) -> (AccountId, AccountId, AccountId, U128) {
        (self.owner.clone(), self.reviewer.clone(), self.operator.clone(), U128(self.inference_fee))
    }

    // ---------- internal ----------

    fn open_job(&self, job_id: u64) -> Job {
        let job = self.jobs.get(&job_id).cloned().expect("no such job");
        require!(job.status == JobStatus::Open, "this job is already closed");
        job
    }

    fn credit(&mut self, account: &AccountId, amount: u128) {
        if amount == 0 {
            return;
        }
        let current = self.balances.get(account).copied().unwrap_or(0);
        self.balances.insert(account.clone(), current + amount);
    }
}

fn require_hash(value: &str, field: &str) {
    require!(value.len() == 64 && value.bytes().all(|b| b.is_ascii_hexdigit()), format!("{field} must be a hex sha256"));
}

fn log_event(event: &str, job_id: u64) {
    env::log_str(&format!("hive:{event} job={job_id}"));
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    const NEAR: u128 = 1_000_000_000_000_000_000_000_000;
    const FEE: u128 = NEAR / 100;
    const H: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const DEADLINE: u64 = 1_000;

    fn acc(s: &str) -> AccountId {
        s.parse().unwrap()
    }

    fn as_caller(caller: &str, deposit: u128, time: u64) {
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(acc(caller))
            .attached_deposit(NearToken::from_yoctonear(deposit))
            .block_timestamp(time)
            .build());
    }

    /// A hive with one 1-NEAR job and two enrolled agents who have both submitted.
    fn hive_with_submissions() -> Hive {
        as_caller("owner.testnet", 0, 1);
        let mut h = Hive::new(acc("owner.testnet"), acc("reviewer.testnet"), acc("operator.testnet"), U128(FEE));
        as_caller("poster.testnet", NEAR, 1);
        h.post_job(H.into(), DEADLINE);
        for agent in ["scout.testnet", "sage.testnet"] {
            as_caller(agent, NEAR / 10, 2);
            h.enroll(agent.into());
            h.submit(0, H.into(), H.into());
        }
        h
    }

    fn score(agent: &str, score: u8) -> Score {
        Score { agent: acc(agent), score }
    }

    #[test]
    fn submitting_burns_fuel_and_pays_the_operator() {
        let h = hive_with_submissions();
        assert_eq!(h.get_agent(acc("scout.testnet")).unwrap().fuel.0, NEAR / 10 - FEE);
        assert_eq!(h.get_balance(acc("operator.testnet")).0, 2 * FEE);
    }

    #[test]
    fn reward_is_split_by_score_among_passing_answers() {
        let mut h = hive_with_submissions();
        as_caller("reviewer.testnet", 0, 3);
        h.review(0, vec![score("scout.testnet", 90), score("sage.testnet", 60)], H.into());
        assert_eq!(h.get_balance(acc("scout.testnet")).0, NEAR);
        assert_eq!(h.get_balance(acc("sage.testnet")).0, 0);
        assert_eq!(h.get_balance(acc("poster.testnet")).0, 0);
        assert_eq!(h.get_job(0).unwrap().status, JobStatus::Settled);
    }

    #[test]
    fn two_passing_answers_share_and_rounding_goes_back_to_the_poster() {
        let mut h = hive_with_submissions();
        as_caller("reviewer.testnet", 0, 3);
        h.review(0, vec![score("scout.testnet", 92), score("sage.testnet", 71)], H.into());
        let scout = h.get_balance(acc("scout.testnet")).0;
        let sage = h.get_balance(acc("sage.testnet")).0;
        let back = h.get_balance(acc("poster.testnet")).0;
        assert!(scout > sage);
        assert_eq!(scout + sage + back, NEAR);
    }

    #[test]
    fn poster_is_refunded_when_nothing_passes() {
        let mut h = hive_with_submissions();
        as_caller("reviewer.testnet", 0, 3);
        h.review(0, vec![score("scout.testnet", 40), score("sage.testnet", 10)], H.into());
        assert_eq!(h.get_balance(acc("poster.testnet")).0, NEAR);
    }

    #[test]
    #[should_panic(expected = "only the reviewer")]
    fn agents_cannot_review_their_own_work() {
        let mut h = hive_with_submissions();
        as_caller("scout.testnet", 0, 3);
        h.review(0, vec![score("scout.testnet", 100)], H.into());
    }

    #[test]
    #[should_panic(expected = "already closed")]
    fn a_job_cannot_be_settled_twice() {
        let mut h = hive_with_submissions();
        as_caller("reviewer.testnet", 0, 3);
        h.review(0, vec![score("scout.testnet", 90)], H.into());
        h.review(0, vec![score("sage.testnet", 90)], H.into());
    }

    #[test]
    #[should_panic(expected = "one submission per agent")]
    fn an_agent_submits_once_per_job() {
        let mut h = hive_with_submissions();
        as_caller("scout.testnet", 0, 3);
        h.submit(0, H.into(), H.into());
    }

    #[test]
    #[should_panic(expected = "not enough fuel")]
    fn an_agent_without_fuel_cannot_submit() {
        as_caller("owner.testnet", 0, 1);
        let mut h = Hive::new(acc("owner.testnet"), acc("reviewer.testnet"), acc("operator.testnet"), U128(NEAR));
        as_caller("poster.testnet", NEAR, 1);
        h.post_job(H.into(), DEADLINE);
        as_caller("scout.testnet", NEAR / 10, 2);
        h.enroll("scout".into());
        h.submit(0, H.into(), H.into());
    }

    #[test]
    fn unreviewed_job_is_refunded_after_its_deadline() {
        let mut h = hive_with_submissions();
        as_caller("poster.testnet", 0, DEADLINE + 1);
        h.refund(0);
        assert_eq!(h.get_balance(acc("poster.testnet")).0, NEAR);
        assert_eq!(h.get_job(0).unwrap().status, JobStatus::Refunded);
    }

    #[test]
    #[should_panic(expected = "still running")]
    fn poster_cannot_pull_the_reward_while_the_job_runs() {
        let mut h = hive_with_submissions();
        as_caller("poster.testnet", 0, 5);
        h.refund(0);
    }

    #[test]
    fn withdraw_empties_the_balance() {
        let mut h = hive_with_submissions();
        as_caller("reviewer.testnet", 0, 3);
        h.review(0, vec![score("scout.testnet", 90)], H.into());
        as_caller("scout.testnet", 0, 4);
        h.withdraw().detach();
        assert_eq!(h.get_balance(acc("scout.testnet")).0, 0);
    }

    #[test]
    #[should_panic(expected = "nothing to withdraw")]
    fn withdrawing_an_empty_balance_fails() {
        let mut h = hive_with_submissions();
        as_caller("nobody.testnet", 0, 4);
        h.withdraw().detach();
    }
}
