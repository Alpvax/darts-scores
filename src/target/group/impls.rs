use super::{super::BoardSection, TargetGroup};

impl TargetGroup for &BoardSection {
    type Iter = core::iter::Once<BoardSection>;

    fn contains<T>(self, other: &T) -> bool
    where
        T: TargetGroup,
    {
        match other.len() {
            // 0 => false,
            1 => other.iter().next().unwrap() == *self,
            _ => false,
        }
    }

    fn len(self) -> usize {
        1
    }

    fn iter(self) -> Self::Iter {
        core::iter::once(*self)
    }
}

impl<'a> TargetGroup for &'a [BoardSection] {
    type Iter = core::iter::Copied<core::slice::Iter<'a, BoardSection>>;

    fn contains<T>(self, other: &T) -> bool
    where
        T: TargetGroup,
    {
        other.iter().all(|t| self.as_ref().contains(&t))
    }

    fn len(self) -> usize {
        self.len()
    }

    fn iter(self) -> Self::Iter {
        self.as_ref().iter().copied()
    }
}
impl<'a> TargetGroup for &'a Vec<BoardSection> {
    type Iter = core::iter::Copied<core::slice::Iter<'a, BoardSection>>;

    fn contains<T>(self, other: &T) -> bool
    where
        T: TargetGroup,
    {
        <&[BoardSection] as TargetGroup>::contains(&self[..], other)
    }

    fn len(self) -> usize {
        self.len()
    }

    fn iter(self) -> Self::Iter {
        self[..].iter().copied()
    }
}
impl<'a> TargetGroup for &'a std::collections::HashSet<BoardSection> {
    type Iter = core::iter::Copied<std::collections::hash_set::Iter<'a, BoardSection>>;

    fn contains<T>(self, other: &T) -> bool
    where
        T: TargetGroup,
    {
        self.is_superset(&other.iter().collect())
    }

    fn len(self) -> usize {
        todo!()
    }

    fn iter(self) -> Self::Iter {
        std::collections::HashSet::iter(&self).copied()
    }
}

// Allow returning a single section in the NumIter map_func
impl IntoIterator for BoardSection {
    type Item = Self;

    type IntoIter = core::iter::Once<Self>;

    fn into_iter(self) -> Self::IntoIter {
        core::iter::once(self)
    }
}

/// Iterator from 1..=20 designed to loop through dart board numbers, converting them to BoardTargets.
/// Allows wrapping another iterator or chaining of a second iterator without changing the type of the overall iterator
pub struct NumIter(Box<dyn Iterator<Item = BoardSection>>);
impl NumIter {
    pub fn new<I, M>(map_func: M) -> Self
    where
        I: IntoIterator<Item = BoardSection>,
        M: Fn(u8) -> I,
    {
        Self(Box::new((1..=20).flat_map(map_func)))
    }
    pub fn new_with<I, M, A>(map_func: M, additional: A) -> Self
    where
        I: IntoIterator<Item = BoardSection>,
        M: Fn(u8) -> I,
        A: IntoIterator<Item = BoardSection>,
    {
        Self(Box::new((1..=20).flat_map(map_func).chain(additional.into_iter())))
    }
    pub fn new_n_filtered<F, I, M>(filter: F, map_func: M) -> Self
    where
        F: Fn(&u8) -> bool,
        I: IntoIterator<Item = BoardSection>,
        M: Fn(u8) -> I,
    {
        Self(Box::new((1..=20).filter(filter).flat_map(map_func)))
    }
    pub fn new_n_filtered_with<F, I, M, A>(filter: F, map_func: M, additional: A) -> Self
    where
        F: Fn(&u8) -> bool,
        I: IntoIterator<Item = BoardSection>,
        M: Fn(u8) -> I,
        A: IntoIterator<Item = BoardSection>,
    {
        Self(Box::new((1..=20).filter(filter).flat_map(map_func).chain(additional.into_iter())))
    }
    pub fn new_odd<I, M>(map_func: M) -> Self
    where
        I: IntoIterator<Item = BoardSection>,
        M: Fn(u8) -> I,
    {
        Self::new_n_filtered(|n| n % 2 == 1, map_func)
    }
    pub fn new_odd_with<I, M, A>(map_func: M, additional: A) -> Self
    where
        I: IntoIterator<Item = BoardSection>,
        M: Fn(u8) -> I,
        A: IntoIterator<Item = BoardSection>,
    {
        Self::new_n_filtered_with(|n| n % 2 == 1, map_func, additional)
    }
    pub fn new_even<I, M>(map_func: M) -> Self
    where
        I: IntoIterator<Item = BoardSection>,
        M: Fn(u8) -> I,
    {
        Self::new_n_filtered(|n| n % 2 == 0, map_func)
    }
    pub fn new_even_with<I, M, A>(map_func: M, additional: A) -> Self
    where
        I: IntoIterator<Item = BoardSection>,
        M: Fn(u8) -> I,
        A: IntoIterator<Item = BoardSection>,
    {
        Self::new_n_filtered_with(|n| n % 2 == 0, map_func, additional)
    }
    pub fn empty() -> Self {
        Self(Box::new(core::iter::empty()))
    }
    pub fn wrapping<I>(iter: I) -> Self where I: IntoIterator<Item = BoardSection> {
        Self(Box::new(iter.into_iter()))
    }
}
impl Iterator for NumIter {
    type Item = BoardSection;

    fn next(&mut self) -> Option<Self::Item> {
        self.0.next()
    }
}