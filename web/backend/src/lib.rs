use mid_util::prim::prelude::*;
use wasm_bindgen::prelude::*;

#[derive(Default)]
struct Example {
	a: u32,
	b: i32,
}

impl Provider for Example {
	fn provide<'r>(&'r self, demand: &mut Demand<'r>) {
		demand.propose(&self.a);
		demand.propose(&self.b);
	}
}

#[wasm_bindgen]
pub fn boot() {
	console_error_panic_hook::set_once();
	console_log::init_with_level(log::Level::Debug).expect("logger already initialized");

	log::info!("Hello, World! This is a test of Parcel caching.");

	let example = Example::default();
	log::info!("{}", example.get::<u32>());
	log::info!("{}", example.get::<i32>());
}
