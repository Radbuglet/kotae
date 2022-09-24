pub trait OptionExt {
	type Value;

	fn is_some_and<F>(self, f: F) -> bool
	where
		F: FnOnce(Self::Value) -> bool;
}

impl<T> OptionExt for Option<T> {
	type Value = T;

	fn is_some_and<F>(self, f: F) -> bool
	where
		F: FnOnce(Self::Value) -> bool,
	{
		self.map_or(false, f)
	}
}
