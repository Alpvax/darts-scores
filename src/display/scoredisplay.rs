use core::fmt::Display;
use std::ops::AddAssign;

const SUPER_NUMBERS: &'static str = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUPER_MINUS: char = '⁻';
const SUPER_PLUS: char = '⁺';

pub struct ScoreDisplay<T, D>
where
    T: ::num::Integer + Display,
    D: ::num::Integer + Display,
{
    total: T,
    delta: D,
}
fn make_superscript_num(formatted: String) -> String {
    formatted
        .chars()
        .map(|c| {
            if let Some(i) = c.to_digit(10) {
                SUPER_NUMBERS.chars().nth(i.try_into().unwrap()).unwrap()
            } else {
                match c {
                    '-' => SUPER_MINUS,
                    '+' => SUPER_PLUS,
                    _ => c,
                }
            }
        })
        .collect()
}

impl<T, D> Display for ScoreDisplay<T, D>
where
    T: ::num::Integer + Display,
    D: ::num::Integer + Display,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.total.fmt(f)?;
        write!(
            f,
            " ({})",
            &make_superscript_num(format!("{:+}", self.delta))
        )
    }
}

pub struct ScoreDisplayIter<'iter, 'acc, T, D>
where
    T: Clone + ::num::Integer + Display,
    D: ::num::Integer + Display,
{
    // pub struct ScoreDisplayIter<T, D> {
    score: T,
    turns: Box<dyn 'iter + Iterator<Item = D>>,
    // turns: Box<dyn Iterator<Item = D>>,
    acc: Box<dyn 'acc + Fn(&mut T, &D) -> ()>,
    // acc: Box<dyn Fn(&mut T, &D) -> ()>,
}
impl<'iter, 'acc, T, D> ScoreDisplayIter<'iter, 'acc, T, D>
where
    T: Clone + ::num::Integer + Display,
    D: ::num::Integer + Display,
{
    // impl<T, D> ScoreDisplayIter<T, D> {
    pub fn new<I, F>(start_score: T, rounds: I, acc_func: F) -> Self
    where
        I: 'iter + IntoIterator<Item = D>,
        F: 'acc + Fn(&mut T, &D) -> (),
    {
        Self {
            score: start_score,
            turns: Box::new(rounds.into_iter()),
            acc: Box::new(acc_func),
        }
    }
    // }
    // impl<T, D, I> ScoreDisplayIter<T, D, I> where I: Iterator<Item = D>, T: AddAssign<D> {
    pub fn new_addassign<I>(start_score: T, rounds: I) -> Self
    where
        I: 'iter + IntoIterator<Item = D>,
        T: AddAssign<D>,
        D: Copy,
    {
        Self::new(start_score, rounds.into_iter(), |t, d| {
            <T as AddAssign<D>>::add_assign(t, *d)
        })
    }
    // }
    // impl<T, D, I> ScoreDisplayIter<T, D, I> where I: Iterator<Item = D> {
    pub fn new_add_map<I, F, U>(start_score: T, rounds: I, map_func: F) -> Self
    where
        I: 'iter + IntoIterator<Item = D>,
        T: AddAssign<U>,
        F: 'acc + Fn(&D) -> U,
    {
        Self::new(start_score, rounds.into_iter(), move |t, d| {
            <T as AddAssign<U>>::add_assign(t, map_func(d))
        })
    }
}

impl<'iter, 'acc, T, D> Iterator for ScoreDisplayIter<'iter, 'acc, T, D>
where
    T: Clone + ::num::Integer + Display,
    D: ::num::Integer + Display,
{
    // impl<T, D> Iterator for ScoreDisplayIter<T, D> {
    type Item = ScoreDisplay<T, D>;

    fn next(&mut self) -> Option<Self::Item> {
        (*self.turns).next().map(|d| {
            (&self.acc)(&mut self.score, &d);
            ScoreDisplay {
                total: self.score.clone(),
                delta: d,
            }
        })
    }
}
