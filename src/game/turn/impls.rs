use crate::target::BoardSection;

use super::{GameTurn, DartResult, NumDarts, TurnResult};

pub struct SingleTarget {
    target: BoardSection,
    num_darts: NumDarts,
    darts: Vec<TargetHit>,
}
impl SingleTarget {
    pub fn new<N>(num_darts: N, target: BoardSection) -> Self where N: Into<NumDarts> {
        Self { target, num_darts: num_darts.into(), darts: Vec::new() }
    }
    pub fn try_new<N>(num_darts: N, target: BoardSection) -> Result<Self, N::Error> where N: TryInto<NumDarts> {
        num_darts.try_into().map(|num_darts| Self { target, num_darts, darts: Vec::new() })
    }
    pub fn target(&self) -> BoardSection {
        self.target
    }
    pub fn hits(&self) -> u8 {
        self.darts.iter().sum()
    }
}
impl GameTurn for SingleTarget {
    fn num_darts(&self) -> NumDarts {
        self.num_darts
    }

    fn darts_thrown(&self) -> u8 {
        self.darts.len().try_into().unwrap()
    }

    fn throw_dart(&mut self, hit: BoardSection) -> DartResult {
        self.darts.push(if self.target == hit {
            TargetHit::Hit
        } else {
            TargetHit::Miss
        });
        self.remaining_darts().decrement(|| self.result())
    }

    fn result(&self) -> TurnResult {
        TurnResult::Score(self.num_darts.into())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TargetHit {
    // NotThrown,
    Miss,
    Hit,
}
impl From<TargetHit> for u8 {
    fn from(h: TargetHit) -> Self {
        match h {
            TargetHit::Hit => 1,
            _ => 0,
        }
    }
}
impl From<&TargetHit> for u8 {
    fn from(h: &TargetHit) -> Self {
        match h {
            TargetHit::Hit => 1,
            _ => 0,
        }
    }
}
impl core::ops::Add<Self> for TargetHit {
    type Output = u8;

    fn add(self, rhs: Self) -> Self::Output {
        match (self, rhs) {
            (Self::Hit, Self::Hit) => 2,
            (Self::Hit, _) | (_, Self::Hit)=> 1,
            _ => 0,
        }
    }
}
impl core::ops::Add<u8> for TargetHit {
    type Output = u8;

    fn add(self, rhs: u8) -> Self::Output {
        <u8 as From<_>>::from(self) + rhs
    }
}
impl core::ops::Add<TargetHit> for u8 {
    type Output = u8;

    fn add(self, rhs: TargetHit) -> Self::Output {
        self + <u8 as From<_>>::from(rhs)
    }
}
impl core::ops::Add<&TargetHit> for u8 {
    type Output = u8;

    fn add(self, rhs: &TargetHit) -> Self::Output {
        self + <u8 as From<_>>::from(rhs)
    }
}
impl core::ops::AddAssign<TargetHit> for u8 {
    fn add_assign(&mut self, rhs: TargetHit) {
        *self += <u8 as From<_>>::from(rhs);
    }
}
impl core::ops::AddAssign<&TargetHit> for u8 {
    fn add_assign(&mut self, rhs: &TargetHit) {
        *self += <u8 as From<_>>::from(rhs);
    }
}
impl<'a> core::iter::Sum<&'a TargetHit> for u8 {
    fn sum<I: Iterator<Item = &'a TargetHit>>(iter: I) -> Self {
        let mut sum = 0;
        for hit in iter {
            sum += hit;
        }
        sum
    }
}