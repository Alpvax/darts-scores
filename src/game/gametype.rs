use super::score::GameScore;

pub trait GameType {
    const ID: &'static str;
    type Score: GameScore;
    #[cfg(feature = "serde")]
    type Config: ::serde::Serialize + ::serde::Deserialize;
    #[cfg(not(feature = "serde"))]
    type Config;
    /// Create a new active (in play) score for the given player (allows handicaps)
    fn new_score(config: &Self::Config, player: &crate::player::Player) -> <Self::Score as GameScore>::Active;
    /// Helper wrapper around `Game::new` to make inferring game type easier
    fn new<P>(players: P, config: Self::Config) -> super::Game<Self>
    where
        Self: Sized,
        P: IntoIterator<Item = crate::player::Player>,
    {
        super::Game::new(players, config)
    }
    /// Helper wrapper around `Game::new` to make inferring game type easier, with the config defaults
    fn new_default<P>(players: P) -> super::Game<Self>
    where
        Self: Sized,
        P: IntoIterator<Item = crate::player::Player>,
        Self::Config: Default,
    {
        super::Game::new(players, Self::Config::default())
    }
    // fn new_holder<P>(players: P, config: Self::Config) -> crate::games::GameHolder where P: IntoIterator<Item = crate::player::Player>;
    /// Called when a player has finished the game, to decide whether play should continue.
    /// # Arguments
    ///
    /// * `round_players` - The players who have not yet taken the current turn (if empty then this is the final player of the round)
    /// * `remaining_players` - The players who have not yet finished the game
    fn should_end_game<'g, PR, PU>(round_players: PR, remaining_players: PU, config: &'g Self::Config) -> super::GameEnd
    where
        PR: IntoIterator<Item = &'g crate::player::Player>,
        PU: IntoIterator<Item = &'g crate::player::Player>,
        ;
}
