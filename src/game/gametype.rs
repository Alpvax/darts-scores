use super::round::Turn;
use super::score::GameScore;

pub trait GameType {
    type Turn: Turn;
    type Score: core::ops::AddAssign<<Self::Turn as Turn>::Score> + GameScore<Self::Turn>;
    type PlayerSummary: core::fmt::Display;
    type Config;
    fn new_score(player: &crate::player::Player) -> Self::Score;
    /// Helper wrapper around `Game::new` to make inferring game type easier
    fn new<P>(players: P, config: Self::Config) -> super::Game<Self>
    where
        Self: Sized,
        P: IntoIterator<Item = crate::player::Player>,
    {
        super::Game::new(players, config)
    }
    // fn new_holder<P>(players: P, config: Self::Config) -> crate::games::GameHolder where P: IntoIterator<Item = crate::player::Player>;
    fn should_end_game<'g, P>(remaining_players: P, config: &'g Self::Config) -> GameEnd
    where
        P: IntoIterator<Item = &'g crate::player::Player>;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameEnd {
    EndGame,
    FinishRound,
    Continue,
}
