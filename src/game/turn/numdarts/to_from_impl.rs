use super::*;
use core::ops::{Bound, Range, RangeBounds, RangeInclusive, RangeTo, RangeToInclusive};

impl From<NumDarts> for u8 {
    fn from(n: NumDarts) -> Self {
        n.value()
    }
}
impl From<NumDarts> for core::ops::Range<u8> {
    fn from(n: NumDarts) -> Self {
        match n {
            NumDarts::UpTo(n) => 0..n + 1,
            NumDarts::Exactly(n) => n..n + 1,
        }
    }
}
impl RangeBounds<u8> for NumDarts {
    fn start_bound(&self) -> Bound<&u8> {
        Bound::Included(match self {
            NumDarts::UpTo(_) => &0,
            NumDarts::Exactly(n) => n,
        })
    }

    fn end_bound(&self) -> std::ops::Bound<&u8> {
        Bound::Included(match self {
            NumDarts::UpTo(n) => n,
            NumDarts::Exactly(n) => n,
        })
    }
}
impl From<u8> for NumDarts {
    fn from(n: u8) -> Self {
        Self::Exactly(n)
    }
}

macro_rules! try_from_int {
    ($($typ:ty),+ $(,)?) => {
        $(
            impl TryFrom<$typ> for NumDarts {
                type Error = <$typ as TryInto<u8>>::Error;
            
                fn try_from(value: $typ) -> Result<Self, Self::Error> {
                    Ok(Self::Exactly(value.try_into()?))
                }
            }
        )+
    };
}
try_from_int!(usize);


pub enum TryFromError<T> where T: TryInto<u8> {
    NonZeroStart(T),
    CastStart(T::Error),
    CastEnd(T::Error),
}

impl<T> TryFrom<Range<T>> for NumDarts where T: TryInto<u8> {
    type Error = TryFromError<T>;
    
    fn try_from(r: Range<T>) -> Result<NumDarts, TryFromError<T>> {
        match <T as TryInto<u8>>::try_into(r.start) {
            Ok(start) => if start != 0 {
                Err(TryFromError::NonZeroStart(r.start))
            } else {
                match <T as TryInto<u8>>::try_into(r.end) {
                    Ok(end) => Ok(Self::UpTo(end - 1)),
                    Err(e) => Err(TryFromError::CastEnd(e)),
                }
            },
            Err(e) => Err(TryFromError::CastStart(e)),
        }
    }
}
impl<T> TryFrom<RangeInclusive<T>> for NumDarts where T: TryInto<u8> + Copy {
    type Error = TryFromError<T>;
    
    fn try_from(r: RangeInclusive<T>) -> Result<NumDarts, TryFromError<T>> {
        match <T as TryInto<u8>>::try_into(*r.start()) {
            Ok(start) => if start != 0 {
                Err(TryFromError::NonZeroStart(*r.start()))
            } else {
                match <T as TryInto<u8>>::try_into(*r.end()) {
                    Ok(end) => Ok(Self::UpTo(end)),
                    Err(e) => Err(TryFromError::CastEnd(e)),
                }
            },
            Err(e) => Err(TryFromError::CastStart(e)),
        }
    }
}

impl<T> From<RangeTo<T>> for NumDarts where T: Into<u8> {
    fn from(r: RangeTo<T>) -> Self {
        Self::UpTo(r.end.into() - 1)
    }
}
impl<T> From<RangeToInclusive<T>> for NumDarts where T: Into<u8> + Copy {
    fn from(r: RangeToInclusive<T>) -> Self {
        Self::UpTo(r.end.into())
    }
}