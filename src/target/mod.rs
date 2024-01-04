#![allow(dead_code)] //XXX?

use std::borrow::Borrow;

pub use self::group::TargetGroup;
mod group;
pub mod numhits;

/// A specific, bounded section of the board
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum BoardSection {
    /// Segment, Section
    Number(u8, Ring),
    /// Inner?
    Bull(bool),
    /// Number inside
    Oxo(u8),
}
impl BoardSection {
    pub fn colour(&self) -> Option<Colour> {
        match self {
            BoardSection::Number(n, s) => Some(match (n % 2 == 0, s) {
                (true, Ring::SingleInner | Ring::SingleOuter) => Colour::Black,
                (true, Ring::Treble | Ring::Double) => Colour::Red,
                (false, Ring::SingleInner | Ring::SingleOuter) => Colour::White,
                (false, Ring::Treble | Ring::Double) => Colour::Green,
            }),
            BoardSection::Bull(true) => Some(Colour::Red),
            BoardSection::Bull(false) => Some(Colour::Green),
            BoardSection::Oxo(_) => None,
        }
    }
    pub fn ring(&self) -> Option<Ring> {
        match self {
            BoardSection::Number(_, ring) => Some(*ring),
            _ => None,
        }
    }
    pub fn number(&self) -> Option<u8> {
        match self {
            BoardSection::Number(n, _) => Some(*n),
            _ => None,
        }
    }
    pub fn or<I>(&self, others: I) -> std::collections::HashSet<Self>
    where
        I: Iterator,
        I::Item: Borrow<Self>,
    {
        core::iter::once(*self)
            .chain(others.map(|t| *t.borrow()))
            .collect::<std::collections::HashSet<_>>()
    }
    // pub fn group_of_colours
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Ring {
    SingleInner,
    Treble,
    SingleOuter,
    Double,
}
impl Ring {
    pub fn singles() -> impl TargetGroup {
        &[Self::SingleInner, Self::SingleOuter]
    }
    pub fn doubles() -> impl TargetGroup {
        &Self::Double
    }
    pub fn trebles() -> impl TargetGroup {
        &Self::Treble
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Colour {
    Black,
    White,
    Green,
    Red,
    // None,
}
