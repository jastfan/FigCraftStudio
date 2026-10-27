//! FigCraft Collaboration Networking
//! Multi-user real-time session coordination, peer-to-peer cursor tracking,
//! and atomic command operational sync for collaborative design teams.

use figcraft_doc::DesignDocument;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserCursor {
    pub user_id: String,
    pub user_name: String,
    pub color: String,
    pub x: f32,
    pub y: f32,
    pub selected_node_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SyncMessage {
    Join { user_id: String, user_name: String },
    Leave { user_id: String },
    CursorMove { cursor: UserCursor },
    FullDocumentSync { doc: DesignDocument },
}

pub struct DesignRoom {
    pub room_id: String,
    pub doc: DesignDocument,
    pub users: HashMap<String, UserCursor>,
}

impl DesignRoom {
    pub fn new(room_id: &str) -> Self {
        Self {
            room_id: room_id.to_string(),
            doc: DesignDocument::default(),
            users: HashMap::new(),
        }
    }

    pub fn update_cursor(&mut self, cursor: UserCursor) {
        self.users.insert(cursor.user_id.clone(), cursor);
    }

    pub fn remove_user(&mut self, user_id: &str) {
        self.users.remove(user_id);
    }
}

#[derive(Clone, Default)]
pub struct CollaborationHub {
    pub rooms: Arc<Mutex<HashMap<String, DesignRoom>>>,
}

impl CollaborationHub {
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn get_or_create_room(&self, room_id: &str) -> Arc<Mutex<DesignRoom>> {
        let mut rooms = self.rooms.lock().unwrap();
        if !rooms.contains_key(room_id) {
            rooms.insert(room_id.to_string(), DesignRoom::new(room_id));
        }
        Arc::new(Mutex::new(rooms.get(room_id).unwrap().clone()))
    }
}

impl Clone for DesignRoom {
    fn clone(&self) -> Self {
        Self {
            room_id: self.room_id.clone(),
            doc: self.doc.clone(),
            users: self.users.clone(),
        }
    }
}
