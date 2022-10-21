// #[derive(Debug, Clone, PartialEq, Eq, Hash)]
// pub struct Player {
//     pub id: u8,
//     pub name: String,
//     pub fun: Option<String>,
// }

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Player {
    Mikael,
    Steve,
    Matt,
    Nick,
    Cathy,
    Kasia,
    Darren,
    // Guest(String),
}
impl Player {
    pub fn name(&self) -> &str {
        match self {
            Player::Mikael => "Mikael",
            Player::Steve => "Steve",
            Player::Matt => "Matt",
            Player::Nick => "Nick",
            Player::Cathy => "Cathy",
            Player::Kasia => "Kasia",
            Player::Darren => "Darren",
        }
    }
    pub fn fun_name(&self) -> &str {
        match self {
            Player::Mikael => "Hans",
            Player::Steve => "Javelin",
            Player::Matt => "Cliff",
            Player::Nick => "Fat Nick",
            Player::Cathy => "French",
            Player::Kasia => "Kasia",
            Player::Darren => "Darren",
        }
    }
}
impl core::fmt::Display for Player {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if f.alternate() {
            self.fun_name()
        } else {
            self.name()
        }
        .fmt(f)
    }
}
