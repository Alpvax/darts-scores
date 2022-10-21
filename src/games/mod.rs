mod twentyseven;

use crate::game::Game;

pub use self::twentyseven::GameType27 as TwentySeven;

pub enum GameHolder {
    TwentySeven(Game<TwentySeven>),
}

impl GameHolder {
    // pub fn new<T>() -> Self where T: GameType {
    //     Game::new(players, config)
    // }
    pub fn new_27<P>(players: P) -> Self
    where
        P: IntoIterator<Item = crate::player::Player>,
    {
        Self::TwentySeven(Game::new(players, ()))
    }
    // pub fn get(&self) -> &Game<> where T: crate::game::GameType {
    //     match self {
    //         GameHolder::TwentySeven(g) => g,
    //     }
    // }
    pub fn column_count(&self) -> usize {
        match self {
            GameHolder::TwentySeven(g) => g.scores().len() + 1,
        }
    }
    pub fn scores(
        &self,
    ) -> &::indexmap::IndexMap<crate::player::Player, /*TODO: T*/ twentyseven::Score27> {
        match self {
            GameHolder::TwentySeven(g) => g.scores(),
        }
    }
    pub fn scores_mut(
        &self,
    ) -> &mut ::indexmap::IndexMap<crate::player::Player, /*TODO: T*/ twentyseven::Score27> {
        match self {
            GameHolder::TwentySeven(g) => g.scores_mut(),
        }
    }
}
