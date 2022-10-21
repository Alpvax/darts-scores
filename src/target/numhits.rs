// use ::num::{FromPrimitive, ToPrimitive};

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum NumHits {
    None,
    One,
    Two,
    Three,
}
impl NumHits {
    pub fn value(&self, target: i8) -> i8 {
        target
            * match self {
                NumHits::None => -2,
                NumHits::One => 2,
                NumHits::Two => 4,
                NumHits::Three => 6,
            }
    }
}
impl From<NumHits> for u8 {
    fn from(n: NumHits) -> Self {
        match n {
            NumHits::None => 0,
            NumHits::One => 1,
            NumHits::Two => 2,
            NumHits::Three => 3,
        }
    }
}
impl std::default::Default for NumHits {
    fn default() -> Self {
        Self::None
    }
}
impl core::fmt::Debug for NumHits {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{:+}",
            match self {
                NumHits::None => -2,
                NumHits::One => 2,
                NumHits::Two => 4,
                NumHits::Three => 6,
            }
        )
    }
}
// impl FromPrimitive for NumHits {
//     fn from_i64(n: i64) -> Option<Self> {
//         match n {
//             0 => Some(Self::None),
//             1 => Some(Self::One),
//             2 => Some(Self::Two),
//             3 => Some(Self::Three),
//             _ => None,
//         }
//     }

//     fn from_u64(n: u64) -> Option<Self> {
//         match n {
//             0 => Some(Self::None),
//             1 => Some(Self::One),
//             2 => Some(Self::Two),
//             3 => Some(Self::Three),
//             _ => None,
//         }
//     }
// }
// impl ToPrimitive for NumHits {
//     fn to_i64(&self) -> Option<i64> {
//         Some(match self {
//             NumHits::None => 0,
//             NumHits::One => 1,
//             NumHits::Two => 2,
//             NumHits::Three => 3,
//         })
//     }

//     fn to_u64(&self) -> Option<u64> {
//         Some(match self {
//             NumHits::None => 0,
//             NumHits::One => 1,
//             NumHits::Two => 2,
//             NumHits::Three => 3,
//         })
//     }
// }
// impl ::num::NumCast for NumHits {
//     fn from<T: ToPrimitive>(n: T) -> Option<Self> {
//         n.to_u8().and_then(|n| match n {
//             0 => Some(Self::None),
//             1 => Some(Self::One),
//             2 => Some(Self::Two),
//             3 => Some(Self::Three),
//             _ => None,
//         })
//     }
// }
// impl<I> std::ops::AddAssign<I> for NumHits where I: ::num::Integer + ToPrimitive {
//     fn add_assign(&mut self, rhs: I) {
//         if !rhs.is_zero() {
//             let n = rhs.to_u8().expect("Adding too large value to NumHits");
//             if let Self::None = self {
//                 *self = Self::from_u8(n).expect("u8 too large to convert to NumHits");
//             } else {
//                 *self = match (self, n) {
//                     (Self::One, 1) => Self::Two,
//                     (Self::One, 2) | (Self::Two, 1) => Self::Three,
//                     _ => panic!("Attempted to add to NumHits resulting in >3 hits"),
//                 }
//             }
//         }
//     }
// }
