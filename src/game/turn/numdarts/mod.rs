#[derive(Debug, Clone, Copy)]
pub enum NumDarts {
    /// 1..=x darts (may not all be required)
    UpTo(u8),
    /// exactly x darts must be thrown
    Exactly(u8),
}
impl NumDarts {
    pub fn value(&self) -> u8 {
        match self {
            NumDarts::UpTo(n) | NumDarts::Exactly(n) => *n,
        }
    }
    /// Wrapper function to return an end turn result when all darts have been played
    pub fn decrement<F>(&mut self, end_turn_factory: F) -> super::DartResult where F: Fn() -> super::TurnResult {
        *self -= 1;
        if self.value() > 1 {
            super::DartResult::Continue(*self)
        } else {
            super::DartResult::EndTurn(end_turn_factory())
        }
    }
}
mod to_from_impl;

impl core::ops::Sub<u8> for NumDarts {
    type Output = Self;

    fn sub(self, rhs: u8) -> Self::Output {
        let res = |n, f: fn(u8) -> Self| {
            if n > rhs {
                f(n - rhs)
            } else {
                Self::Exactly(0)
            }
        };
        match self {
            NumDarts::UpTo(n) => res(n, NumDarts::UpTo),
            NumDarts::Exactly(n) => res(n, Self::Exactly),
        }
    }
}
impl core::ops::SubAssign<u8> for NumDarts {
    fn sub_assign(&mut self, rhs: u8) {
        *self = *self - rhs
    }
}
impl core::cmp::PartialEq<Self> for NumDarts {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::UpTo(0), Self::Exactly(0)) | (Self::Exactly(0), Self::UpTo(0)) => true,
            (Self::UpTo(l0), Self::UpTo(r0)) => l0 == r0,
            (Self::Exactly(l0), Self::Exactly(r0)) => l0 == r0,
            _ => panic!("Should UpTo(n) == Exactly(n) be implemented?!"),
        }
    }
}
impl core::cmp::PartialOrd<Self> for NumDarts {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        self.value().partial_cmp(&other.value())
    }
}
impl core::cmp::PartialEq<u8> for NumDarts {
    fn eq(&self, other: &u8) -> bool {
        self.value().eq(other)
    }
}
impl core::cmp::PartialOrd<u8> for NumDarts {
    fn partial_cmp(&self, other: &u8) -> Option<std::cmp::Ordering> {
        self.value().partial_cmp(other)
    }
}

pub trait Turn {
    type Score;
    /// Total number of darts to be thrown this round (probably 1..=3)
    fn num_darts(&self) -> NumDarts;
    fn darts_thrown(&self) -> u8;
    fn darts_remaining(&self) -> NumDarts {
        self.num_darts() - self.darts_thrown()
    }
    fn current_round_num(&self) -> usize;
    fn score_dart(&mut self, target: crate::target::BoardSection);
    fn score(self) -> Self::Score;
}
