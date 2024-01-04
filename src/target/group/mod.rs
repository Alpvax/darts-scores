use ::itertools::Itertools;

mod impls;

use self::impls::NumIter;

use super::{BoardSection, Ring};

/// It is recommended that this be implemented for references rather than owned types
pub trait TargetGroup {
    //: IntoIterator<Item = BoardSection> {
    type Iter: Iterator<Item = BoardSection>;
    fn contains<T>(self, other: &T) -> bool
    where
        T: TargetGroup;
    fn len(self) -> usize;
    fn iter(self) -> Self::Iter;
}

impl TargetGroup for &super::Colour {
    type Iter = NumIter;

    fn contains<T>(self, other: &T) -> bool
    where
        T: TargetGroup,
    {
        other.iter().all(|t| t.colour() == Some(*self))
    }

    fn len(self) -> usize {
        match self {
            super::Colour::Black | super::Colour::White => 20, // half of the numbers (odd/even) twice (SingleInner/SingleOuter)
            super::Colour::Green | super::Colour::Red => 21, // half of the numbers twice, plus bull
            // super::Colour::None => 0, // Doesn't iterate Oxo
        }
    }

    fn iter(self) -> Self::Iter {
        let single_rings = |n| {
            [
                BoardSection::Number(n, Ring::SingleInner),
                BoardSection::Number(n, Ring::SingleOuter),
            ].into_iter()
        };
        let coloured_rings = |n| {
            [
                BoardSection::Number(n, Ring::Double),
                BoardSection::Number(n, Ring::Treble),
            ].into_iter()
        };
        match self {
            super::Colour::Black => NumIter::new_even(single_rings),
            super::Colour::White => NumIter::new_odd(single_rings),
            super::Colour::Green => {
                NumIter::new_odd_with(coloured_rings, core::iter::once(BoardSection::Bull(false)))
            }
            super::Colour::Red => {
                NumIter::new_even_with(coloured_rings, core::iter::once(BoardSection::Bull(true)))
            }
            // super::Colour::None => NumIter::empty(),
        }
    }
}

impl TargetGroup for &Ring {
    type Iter = NumIter;

    fn contains<T>(self, other: &T) -> bool
    where
        T: TargetGroup {
            other.iter().all(|t| t.ring() == Some(*self))
    }

    fn len(self) -> usize {
        20
    }

    fn iter(self) -> Self::Iter {
        NumIter::new(|n| BoardSection::Number(n, *self))
    }
}
impl<const N: usize> TargetGroup for &[Ring; N] {
    type Iter = NumIter;

    fn contains<T>(self, other: &T) -> bool
    where
        T: TargetGroup {
        other.iter().all(|t| if let Some(r) = t.ring() {
            self.as_ref().contains(&r)
        } else { false })
    }

    fn len(self) -> usize {
        self.as_ref().iter().unique().count() * 20
    }

    fn iter(self) -> Self::Iter {
        NumIter::new(|n| self.as_ref().iter().unique().map(|r| BoardSection::Number(n, *r)))
    }
}

// macro_rules! impl_multiple {
//     ($($typ:ty => $max),+ $(,)?) => {
//         $(impl_multiple(@n = 2: $typ => $max))+
//     };
//     (@n = $n:expr: $typ)
// }

pub const BULL: [BoardSection; 2] = [BoardSection::Bull(false), BoardSection::Bull(true)];
// pub struct BullGroup;
// impl TargetGroup for &BullGroup {
//     type Iter = core::slice::Iter<'static, &'static BoardSection>;

//     fn contains<T>(self, other: &T) -> bool
//     where
//         T: TargetGroup {
//         other.iter().all(|t| if let BoardSection::Bull(_) = t { true } else { false })
//     }

//     fn len(self) -> usize {
//         2
//     }

//     fn iter(self) -> Self::Iter {
//         BULLS.iter()
//     }
// }