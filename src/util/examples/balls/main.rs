use std::sync::Arc;

use macroquad::prelude::*;
use mid_util::entity::{
	BorrowMutability, DynProvider, LRefCell, Lock, Provider, ProviderExt, ProviderTarget, Session,
	SessionGuard,
};

#[derive(Default)]
pub struct SpatialManager {
	entities: Vec<Arc<dyn DynProvider>>,
}

impl SpatialManager {
	pub fn spawn(&mut self, s: Session, entity: Arc<dyn DynProvider>) {
		entity.use_mut(s, |spatial: &mut Spatial| {
			debug_assert_eq!(spatial.index, usize::MAX);
			spatial.index = self.entities.len();
		});

		self.entities.push(entity);
	}

	pub fn despawn(&mut self, s: Session, entity: &Arc<dyn DynProvider>) {
		entity.use_mut(s, |spatial: &mut Spatial| {
			debug_assert_ne!(spatial.index, usize::MAX);

			self.entities.swap_remove(spatial.index);
			self.entities[spatial.index].use_mut(s, |moved_spatial: &mut Spatial| {
				moved_spatial.index = spatial.index;
			});

			spatial.index = usize::MAX;
		})
	}

	pub fn clear(&mut self, s: Session) {
		for entity in self.entities.drain(..) {
			entity.use_mut(s, |spatial: &mut Spatial| {
				spatial.index = usize::MAX;
			});
		}
	}

	pub fn entities(&self) -> &[Arc<dyn DynProvider>] {
		&self.entities
	}

	pub fn entities_near<'a>(
		&'a self,
		s: Session<'a>,
		pos: Vec2,
		radius: f32,
	) -> impl Iterator<Item = &'a Arc<dyn DynProvider>> + 'a {
		self.entities.iter().filter(move |entity| {
			entity.use_ref(s, |spatial: &Spatial| spatial.pos.distance(pos) < radius)
		})
	}
}

#[derive(Debug, Clone)]
pub struct Spatial {
	index: usize,
	pos: Vec2,
}

impl Default for Spatial {
	fn default() -> Self {
		Self {
			index: usize::MAX,
			pos: Default::default(),
		}
	}
}

#[derive(Default)]
#[non_exhaustive]
pub struct SpriteManager;

impl SpriteManager {
	pub fn render(&mut self, s: Session, mgr: &SpatialManager) {
		for entity in mgr.entities() {
			let pos = entity.use_ref(s, |spatial: &Spatial| spatial.pos);
			let color = entity.use_ref(s, |sprite: &Sprite| sprite.color);
			let is_kinematic = entity.has::<LRefCell<Kinematic>>();

			draw_circle(pos.x, pos.y, if is_kinematic { 10. } else { 5. }, color);
		}
	}
}

#[derive(Debug, Clone)]
pub struct Sprite {
	color: Color,
}

#[derive(Debug, Clone, Default)]
pub struct Kinematic {
	vel: Vec2,
}

#[macroquad::main("MIDE Util Demo")]
async fn main() {
	let main_lock = Lock::new("main lock");

	let session = SessionGuard::new_tls();
	let s = session.handle();
	s.acquire_locks([(main_lock, BorrowMutability::Mutable)]);

	let engine = EngineRootEntity::new(s, main_lock);

	while !is_quit_requested() {
		clear_background(BLACK);

		// Update
		engine.use_mut(s, |spatial_manager: &mut SpatialManager| {
			// Spawn new sprites
			{
				let thingy = make_thingy(s, main_lock);
				thingy.use_mut(s, |spatial: &mut Spatial| {
					spatial.pos = Vec2::new(
						fastrand::f32() * screen_width(),
						fastrand::f32() * screen_height(),
					)
				});
				spatial_manager.spawn(s, thingy);
			}
			{
				let entity_count = spatial_manager.entities().len();
				if entity_count > 1000 {
					let target = fastrand::usize(0..(entity_count - 1)); // Don't ask. `fastrand` is weird.
					let target = spatial_manager.entities()[target].clone();
					spatial_manager.despawn(s, &target);
				}
			}

			// Process destroy-all request
			if is_key_down(KeyCode::Space) {
				spatial_manager.clear(s);
			}

			// Process kinematics
			for entity in spatial_manager.entities() {
				let kinematic = match entity.try_get::<LRefCell<Kinematic>>() {
					Ok(comp) => comp,
					Err(_) => continue,
				};

				entity.use_mut(s, |spatial: &mut Spatial| {
					kinematic.use_mut(s, |kinematic| {
						kinematic.vel += (Vec2::from(mouse_position()) - spatial.pos) * 0.001;

						spatial.pos += kinematic.vel;
					});
				});
			}
		});

		// Render
		engine.use_ref(s, |spatial_manager: &SpatialManager| {
			engine.use_mut(s, |sprite_manager: &mut SpriteManager| {
				sprite_manager.render(s, &spatial_manager);
			});
		});

		next_frame().await;
	}
}

struct EngineRootEntity {
	spatial_mgr: LRefCell<SpatialManager>,
	sprite_mgr: LRefCell<SpriteManager>,
}

impl EngineRootEntity {
	pub fn new(_: Session, lock: Lock) -> Self {
		Self {
			spatial_mgr: LRefCell::new(lock, Default::default()),
			sprite_mgr: LRefCell::new(lock, Default::default()),
		}
	}
}

impl Provider for EngineRootEntity {
	fn provide<'r, U>(&'r self, target: &mut U)
	where
		U: ?Sized + ProviderTarget<'r>,
	{
		target.propose(&self.spatial_mgr);
		target.propose(&self.sprite_mgr);
	}
}

pub struct ThingyEntity {
	spatial: LRefCell<Spatial>,
	sprite: LRefCell<Sprite>,
}

impl Provider for ThingyEntity {
	fn provide<'r, U>(&'r self, target: &mut U)
	where
		U: ?Sized + ProviderTarget<'r>,
	{
		target.propose(&self.spatial);
		target.propose(&self.sprite);
	}
}

pub struct KinematicThingyEntity {
	base: ThingyEntity,
	kinematic: LRefCell<Kinematic>,
}

impl Provider for KinematicThingyEntity {
	fn provide<'r, U>(&'r self, target: &mut U)
	where
		U: ?Sized + ProviderTarget<'r>,
	{
		self.base.provide(target);
		target.propose(&self.kinematic);
	}
}

fn make_thingy(_s: Session, lock: Lock) -> Arc<dyn DynProvider> {
	let base = ThingyEntity {
		spatial: LRefCell::new(lock, Default::default()),
		sprite: LRefCell::new(lock, Sprite { color: Color::from_rgba(fastrand::u8(..), fastrand::u8(..), fastrand::u8(..), 255) }),
	};

	if fastrand::bool() {
		Arc::new(KinematicThingyEntity {
			base,
			kinematic: LRefCell::new(lock, Kinematic::default())
		})
	} else {
		Arc::new(base)
	}
}
