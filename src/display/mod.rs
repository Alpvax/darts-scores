mod gui;
pub mod scoredisplay;
// mod repl;

use tabled::{
    builder::Builder,
    style::{HorizontalLine, VerticalLine},
    Style, Table,
};

pub fn make_table<T>(game: &crate::game::Game<T>) -> Table
where
    T: crate::game::GameType,
{
    //, <T::Turn as crate::game::Turn>::Score: core::fmt::Display {
    let style = Style::modern()
        .off_horizontal()
        .off_vertical()
        .horizontals([HorizontalLine::new(1, Style::modern().get_horizontal())])
        .verticals([VerticalLine::new(1, Style::modern().get_vertical())]);

    let mut builder = Builder::new();
    builder.set_columns(
        core::iter::once("Round".to_string())
            .chain(game.scores().keys().map(|p| p.fun_name().to_string())),
    );
    for row in game.rounds() {
        builder.add_record(row);
    }
    let mut table = builder.build();
    table.with(style);
    table
}

// trait GameScoreTable: crate::game::GameType where <Self::Turn as crate::game::Turn>::Score: core::fmt::Display {}
// impl<T> GameScoreTable for T where T: crate::game::GameType, <<T as crate::game::GameType>::Turn as crate::game::Turn>::Score: core::fmt::Display {}

impl<T> core::fmt::Display for crate::game::Game<T>
where
    T: crate::game::GameType,
{
    //, <<T as crate::game::GameType>::Turn as crate::game::Turn>::Score: core::fmt::Display {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", make_table(self))
    }
}

pub use gui::make_gui as new_gui_27;
