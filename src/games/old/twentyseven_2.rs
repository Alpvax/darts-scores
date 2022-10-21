pub struct GameType;
impl crate::game::GameType for GameType {
    type ScoreType = i16;
    type Score = PlayerScore27;
    type Round = Round27;

    fn starting_score(player: &crate::player::Player) -> Self::Score {
        Self::Score::default()
    }

    fn is_finished(game: &crate::game::Game<Self>) -> bool where Self: Sized {
        game.
    }
}

#[derive(Debug, Default)]
struct PlayerScore27([NumHits; 20]);
impl PlayerScore27 {
    fn cliffs(&self) -> u8 {
        self.0
            .iter()
            .filter(|&h| h == &NumHits::Three)
            .count()
            .try_into()
            .unwrap()
    }
    fn all_positive(&self) -> bool {
        let mut score = 27;
        for t in 1..self.current_target {
            score += i32::from(self.0[usize::from(t - 1)].value(t.try_into().unwrap()));
            if score < 0 {
                return false;
            }
        }
        true
    }
}
impl crate::game::PlayerScore for PlayerScore27 {
    type ScoreType = i16;
    type NotableScores = (u8, bool);

    fn total(&self) -> Self::ScoreType {
        todo!()
    }

    fn notable_scores(&self) -> Self::NotableScores {
        (self.cliffs(), self.all_positive())
    }

    fn completed(&self) -> bool {
        todo!()
    }

    fn score<S>(&mut self, round_num: u8, round_score: S) where Self::ScoreType: std::ops::AddAssign<S> {
        todo!()
    }

    fn get_pb(scores: Vec<Self::ScoreType>) -> Option<Self::ScoreType> {
        scores.into_iter().max()
    }
}

struct Round27(u8);
impl crate::game::GameRound for Round27 {
    type RoundScore = NumHits;

    fn new(round_number: u8) -> Self {
        Self(round_number)
    }

    fn score_round(&mut self, score: Self::RoundScore) {
        todo!()
    }

    fn end<G>(self, game: &mut crate::game::Game<G>) -> Self::RoundScore where G: crate::game::GameType<Round = Self> {
        todo!()
    }
}

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
enum NumHits {
    None,
    One,
    Two,
    Three,
}
impl NumHits {
    fn value(&self, target: i8) -> i8 {
        target
            * match self {
                NumHits::None => -2,
                NumHits::One => 2,
                NumHits::Two => 4,
                NumHits::Three => 6,
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