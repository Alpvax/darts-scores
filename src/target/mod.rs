#![allow(dead_code)] //XXX?
pub mod numhits;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Target {
    /// Segment, Section
    Number(u8, Section),
    // Inner?
    Bull(bool),
    // Number inside
    Oxo(u8),
}
impl Target {
    pub fn colour(&self) -> Colour {
        match self {
            Target::Number(n, s) => match (n % 2 == 0, s) {
                (true, Section::SingleInner | Section::SingleOuter) => Colour::Black,
                (true, Section::Triple | Section::Double) => Colour::Red,
                (false, Section::SingleInner | Section::SingleOuter) => Colour::White,
                (false, Section::Triple | Section::Double) => Colour::Green,
            },
            Target::Bull(true) => Colour::Red,
            Target::Bull(false) => Colour::Green,
            Target::Oxo(_) => Colour::None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Section {
    SingleInner,
    Triple,
    SingleOuter,
    Double,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Colour {
    Black,
    White,
    Green,
    Red,
    None,
}
