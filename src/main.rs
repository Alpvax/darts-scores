pub mod display;
mod game;
mod games;
mod player;
pub mod prelude;
mod target;

use player::Player::*;

use crate::game::GameScore;

fn main() {
    display::new_gui_27();
}

#[allow(dead_code)]
fn main_console() {
    let mut game_27: game::Game<games::TwentySeven> = game::Game::new([Matt, Nick, Darren], ());
    println!("Game started at: {}", game_27.date());
    println!("pre:\n{}", game_27);
    println!(
        "Current round (Cliff) = {}",
        game_27.get_score(Matt, |s| s.current_round())
    );
    game_27.take_turn(Matt, |turn| turn.score_hits(1));
    println!("m1:\n{}", game_27);
    game_27.take_turn(Nick, |turn| turn.score_hits(1));
    println!("n1:\n{}", game_27);
    game_27.take_turn(Matt, |turn| turn.score_hits(3));
    game_27.take_turn(Nick, |turn| turn.score_hits(0));
    println!("mn2:\n{}", game_27);
    game_27.take_turn(Nick, |turn| turn.score_hits(3)); // Player plays twice in a row
    println!("n3:\n{}", game_27);
    game_27.take_turn(Nick, |turn| turn.score_hits(0)); // Cliff has been skipped
    println!("n4:\n{}", game_27);

    let mut s = 0;
    for _ in 0..=21 {
        // if s == 0 && game_27.get_score(Darren, |score| score.score() < 0) {
        //     s = 1;
        // }
        game_27.take_turn(Darren, |turn| turn.score_hits(s));
        // println!("{}", game_27);
        if game_27.get_score(Darren, |score| score.is_finished()) {
            println!("\nDarren has finished!\nGAME END #########################################\n{}\n##################################################\n", game_27);
            break;
        }
    }

    for r in 1..=4 {
        println!(
            "{} {}",
            Matt,
            game_27.get_score(Matt, |s| s.hits(r).map_or(
                format!("has not played round {} yet", r),
                |h| format!("hit double_{} {} time(s)", r, h)
            ))
        );
        println!(
            "{} {}",
            r,
            game_27.get_score(Matt, |s| s.cumulative_score(r))
        );
    }
}
