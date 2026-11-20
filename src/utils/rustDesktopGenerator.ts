import JSZip from 'jszip';
import { StoryProject } from '../types/story';

export const RUST_CARGO_TOML = `[package]
name = "screencraft-desktop"
version = "1.0.0"
description = "ScreenCraft Screenwriting and Pre-Production Desktop Application"
authors = ["ScreenCraft Community <support@screencraft.app>"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = [] }
tauri-plugin-dialog = "2.0"
tauri-plugin-fs = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
regex = "1.10"
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1.0"
`;

export const RUST_TAURI_CONF = `{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/tooling/cli/schema.json",
  "build": {
    "beforeDevCommand": "npm run build",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  },
  "package": {
    "productName": "ScreenCraft",
    "version": "1.0.0"
  },
  "app": {
    "windows": [
      {
        "title": "ScreenCraft - Authoring & Pre-Production",
        "width": 1440,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 700,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis", "dmg", "app", "deb", "appimage"],
    "identifier": "com.screencraft.desktop",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "wix": {
        "language": "en-US"
      },
      "nsis": {
        "displayLanguageSelector": true
      }
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "signingIdentity": null
    },
    "linux": {
      "deb": {
        "depends": ["libwebkit2gtk-4.1-0", "libappindicator3-1"]
      }
    }
  }
}
`;

export const RUST_MAIN_RS = `// ScreenCraft - Native Rust Desktop Backend
// Compiled via Tauri for Windows, macOS, and Linux desktop installers

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod screenplay;
mod scheduler;
mod export;

use screenplay::{ScreenplayDocument, ScreenplayElement, SceneInfo};
use scheduler::{Stripboard, ScheduleStrip};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ParseResult {
    pub success: bool,
    pub scenes_count: usize,
    pub total_eighths: u32,
    pub estimated_minutes: f32,
    pub scenes: Vec<SceneInfo>,
    pub elements: Vec<ScreenplayElement>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStats {
    pub os: String,
    pub architecture: String,
    pub memory_allocated_kb: usize,
    pub engine_version: String,
}

// Tauri Command: Parse screenplay text using high-performance Rust parser
#[tauri::command]
fn parse_screenplay(raw_text: String) -> Result<ParseResult, String> {
    let doc = ScreenplayDocument::from_text(&raw_text)
        .map_err(|e| e.to_string())?;

    Ok(ParseResult {
        success: true,
        scenes_count: doc.scenes.len(),
        total_eighths: doc.total_eighths(),
        estimated_minutes: doc.estimated_duration_minutes(),
        scenes: doc.scenes,
        elements: doc.elements,
    })
}

// Tauri Command: Hollywood standard 1/8th page calculator
#[tauri::command]
fn calculate_scene_eighths(line_count: usize) -> u32 {
    screenplay::calculate_eighths(line_count)
}

// Tauri Command: Generate production stripboard from parsed scenes
#[tauri::command]
fn generate_production_strips(scenes: Vec<SceneInfo>) -> Vec<ScheduleStrip> {
    scheduler::build_strips_from_scenes(&scenes)
}

// Tauri Command: Export to Final Draft FDX XML
#[tauri::command]
fn export_final_draft_fdx(title: String, author: String, elements: Vec<ScreenplayElement>) -> String {
    export::generate_fdx_xml(&title, &author, &elements)
}

// Tauri Command: Get desktop system info
#[tauri::command]
fn get_system_info() -> SystemStats {
    SystemStats {
        os: std::env::consts::OS.to_string(),
        architecture: std::env::consts::ARCH.to_string(),
        memory_allocated_kb: 1420,
        engine_version: "ScreenCraft Rust Core v2.4.0".to_string(),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            parse_screenplay,
            calculate_scene_eighths,
            generate_production_strips,
            export_final_draft_fdx,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running ScreenCraft native desktop application");
}
`;

export const RUST_SCREENPLAY_RS = `// Screenplay Parsing and Hollywood Page Count Engine in Rust
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ElementType {
    SceneHeading,
    Action,
    Character,
    Dialogue,
    Parenthetical,
    Transition,
    Shot,
    General,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenplayElement {
    pub id: String,
    pub element_type: ElementType,
    pub text: String,
    pub scene_id: Option<String>,
    pub shot_number: Option<String>,
    pub character: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneInfo {
    pub id: String,
    pub scene_number: usize,
    pub heading: String,
    pub setting: String,
    pub int_ext: String,
    pub day_night: String,
    pub timecode: String,
    pub duration_sec: u32,
    pub pages_formatted: String,
    pub eighths: u32,
    pub characters: Vec<String>,
    pub line_count: usize,
}

pub struct ScreenplayDocument {
    pub elements: Vec<ScreenplayElement>,
    pub scenes: Vec<SceneInfo>,
}

impl ScreenplayDocument {
    pub fn from_text(text: &str) -> Result<Self, anyhow::Error> {
        let lines: Vec<&str> = text.lines().collect();
        let mut elements = Vec::new();
        let mut scenes = Vec::new();

        let heading_re = Regex::new(r"^(?:(?:INT|EXT|INT/EXT|EXT/INT|I/E)[\\.\\s]|(?:[0-9]+\\.\\s*(?:INT|EXT)))")?;
        let shot_re = Regex::new(r"^([0-9]+)\\.\\s+([0-9A-Z\\s/\\-]+)$")?;

        let mut current_scene_num = 0;
        let mut current_scene_id = String::new();
        let mut scene_lines = 0;
        let mut scene_chars = std::collections::HashSet::new();
        let mut cumulative_sec = 0;
        let mut current_heading = String::new();
        let mut current_setting = String::new();
        let mut current_int_ext = "INT".to_string();
        let mut current_day_night = "DAY".to_string();

        for (idx, raw_line) in lines.iter().enumerate() {
            let line = raw_line.trim();
            if line.is_empty() {
                continue;
            }
            scene_lines += 1;

            if heading_re.is_match(line) {
                // Finalize previous scene
                if current_scene_num > 0 && !current_heading.is_empty() {
                    let eighths = calculate_eighths(scene_lines);
                    let dur = std::cmp::max(15, (eighths as f32 / 8.0 * 60.0) as u32);
                    scenes.push(SceneInfo {
                        id: current_scene_id.clone(),
                        scene_number: current_scene_num,
                        heading: current_heading.clone(),
                        setting: current_setting.clone(),
                        int_ext: current_int_ext.clone(),
                        day_night: current_day_night.clone(),
                        timecode: format_timecode(cumulative_sec),
                        duration_sec: dur,
                        pages_formatted: format_eighths(eighths),
                        eighths,
                        characters: scene_chars.into_iter().collect(),
                        line_count: scene_lines,
                    });
                    cumulative_sec += dur;
                    scene_lines = 0;
                    scene_chars = std::collections::HashSet::new();
                }

                current_scene_num += 1;
                current_scene_id = format!("scene-{}", current_scene_num);
                current_heading = line.to_uppercase();

                if line.to_uppercase().contains("EXT") {
                    current_int_ext = "EXT".to_string();
                } else if line.to_uppercase().contains("INT/EXT") {
                    current_int_ext = "INT/EXT".to_string();
                } else {
                    current_int_ext = "INT".to_string();
                }

                if line.to_uppercase().contains("NIGHT") {
                    current_day_night = "NIGHT".to_string();
                } else if line.to_uppercase().contains("DUSK") {
                    current_day_night = "DUSK".to_string();
                } else {
                    current_day_night = "DAY".to_string();
                }

                current_setting = line.replace("INT.", "").replace("EXT.", "").trim().to_uppercase();

                elements.push(ScreenplayElement {
                    id: format!("el-{}", elements.len() + 1),
                    element_type: ElementType::SceneHeading,
                    text: current_heading.clone(),
                    scene_id: Some(current_scene_id.clone()),
                    shot_number: None,
                    character: None,
                });
                continue;
            }

            if let Some(caps) = shot_re.captures(line) {
                elements.push(ScreenplayElement {
                    id: format!("el-{}", elements.len() + 1),
                    element_type: ElementType::Shot,
                    text: line.to_string(),
                    scene_id: Some(current_scene_id.clone()),
                    shot_number: Some(caps[1].to_string()),
                    character: None,
                });
                continue;
            }

            // Check Character
            let is_character = line == line.to_uppercase()
                && line.len() < 35
                && !line.ends_with('.')
                && !line.ends_with(':')
                && idx + 1 < lines.len()
                && !lines[idx + 1].trim().is_empty();

            if is_character {
                let char_name = line.split('(').next().unwrap_or(line).trim().to_string();
                scene_chars.insert(char_name.clone());
                elements.push(ScreenplayElement {
                    id: format!("el-{}", elements.len() + 1),
                    element_type: ElementType::Character,
                    text: line.to_string(),
                    scene_id: Some(current_scene_id.clone()),
                    shot_number: None,
                    character: Some(char_name),
                });
                continue;
            }

            if line.starts_with('(') && line.ends_with(')') {
                elements.push(ScreenplayElement {
                    id: format!("el-{}", elements.len() + 1),
                    element_type: ElementType::Parenthetical,
                    text: line.to_string(),
                    scene_id: Some(current_scene_id.clone()),
                    shot_number: None,
                    character: None,
                });
                continue;
            }

            let prev_is_char = elements.last().map(|e| {
                e.element_type == ElementType::Character || e.element_type == ElementType::Parenthetical
            }).unwrap_or(false);

            if prev_is_char {
                elements.push(ScreenplayElement {
                    id: format!("el-{}", elements.len() + 1),
                    element_type: ElementType::Dialogue,
                    text: line.to_string(),
                    scene_id: Some(current_scene_id.clone()),
                    shot_number: None,
                    character: None,
                });
                continue;
            }

            elements.push(ScreenplayElement {
                id: format!("el-{}", elements.len() + 1),
                element_type: ElementType::Action,
                text: line.to_string(),
                scene_id: Some(current_scene_id.clone()),
                shot_number: None,
                character: None,
            });
        }

        // Finalize last scene
        if current_scene_num > 0 && !current_heading.is_empty() {
            let eighths = calculate_eighths(scene_lines);
            let dur = std::cmp::max(15, (eighths as f32 / 8.0 * 60.0) as u32);
            scenes.push(SceneInfo {
                id: current_scene_id.clone(),
                scene_number: current_scene_num,
                heading: current_heading,
                setting: current_setting,
                int_ext: current_int_ext,
                day_night: current_day_night,
                timecode: format_timecode(cumulative_sec),
                duration_sec: dur,
                pages_formatted: format_eighths(eighths),
                eighths,
                characters: scene_chars.into_iter().collect(),
                line_count: scene_lines,
            });
        }

        Ok(ScreenplayDocument { elements, scenes })
    }

    pub fn total_eighths(&self) -> u32 {
        self.scenes.iter().map(|s| s.eighths).sum()
    }

    pub fn estimated_duration_minutes(&self) -> f32 {
        self.total_eighths() as f32 / 8.0
    }
}

pub fn calculate_eighths(line_count: usize) -> u32 {
    // 55 standard Courier screenplay lines = 8 eighths (1 full page)
    let eighths = ((line_count as f32 / 55.0) * 8.0).round() as u32;
    std::cmp::max(1, eighths)
}

pub fn format_eighths(eighths: u32) -> String {
    let whole = eighths / 8;
    let rem = eighths % 8;
    if whole == 0 && rem == 0 {
        "1/8".to_string()
    } else if whole == 0 {
        format!("{}/8", rem)
    } else if rem == 0 {
        format!("{}", whole)
    } else {
        format!("{} {}/8", whole, rem)
    }
}

pub fn format_timecode(total_sec: u32) -> String {
    let hrs = total_sec / 3600;
    let mins = (total_sec % 3600) / 60;
    let secs = total_sec % 60;
    format!("{:02}:{:02}:{:02}", hrs, mins, secs)
}
`;

export const RUST_SCHEDULER_RS = `// Production Stripboard and Shooting Schedule Engine in Rust
use crate::screenplay::SceneInfo;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleStrip {
    pub id: String,
    pub strip_type: String, // "scene", "day_break", "banner"
    pub scene_number: Option<usize>,
    pub int_ext: Option<String>,
    pub day_night: Option<String>,
    pub set_name: Option<String>,
    pub running_time: Option<String>,
    pub pages: Option<String>,
    pub eighths: Option<u32>,
    pub story_day: Option<u32>,
    pub scheduled_duration: Option<String>,
    pub characters: Vec<String>,
    pub time_of_day: Option<String>,
    pub banner_title: Option<String>,
    pub banner_date: Option<String>,
    pub banner_total_pages: Option<String>,
}

pub struct Stripboard {
    pub strips: Vec<ScheduleStrip>,
}

pub fn build_strips_from_scenes(scenes: &[SceneInfo]) -> Vec<ScheduleStrip> {
    let mut strips = Vec::new();
    let mut current_day = 1;
    let mut day_eighths_accum = 0;

    // Insert Day 1 break
    strips.push(ScheduleStrip {
        id: "day-1-break".to_string(),
        strip_type: "day_break".to_string(),
        scene_number: None,
        int_ext: None,
        day_night: None,
        set_name: None,
        running_time: None,
        pages: None,
        eighths: None,
        story_day: Some(current_day),
        scheduled_duration: None,
        characters: Vec::new(),
        time_of_day: None,
        banner_title: Some(format!("START OF DAY {}", current_day)),
        banner_date: Some("Monday, Nov 10".to_string()),
        banner_total_pages: Some("0 PAGES".to_string()),
    });

    for scene in scenes {
        // Average shooting day is ~4 to 5 pages (32 - 40 eighths)
        if day_eighths_accum >= 36 {
            current_day += 1;
            strips.push(ScheduleStrip {
                id: format!("day-{}-break", current_day),
                strip_type: "day_break".to_string(),
                scene_number: None,
                int_ext: None,
                day_night: None,
                set_name: None,
                running_time: None,
                pages: None,
                eighths: None,
                story_day: Some(current_day),
                scheduled_duration: None,
                characters: Vec::new(),
                time_of_day: None,
                banner_title: Some(format!("START OF DAY {}", current_day)),
                banner_date: Some(format!("Day {}, Nov {}", current_day, 10 + current_day)),
                banner_total_pages: Some("0 PAGES".to_string()),
            });
            day_eighths_accum = 0;
        }

        day_eighths_accum += scene.eighths;

        strips.push(ScheduleStrip {
            id: format!("strip-scene-{}", scene.scene_number),
            strip_type: "scene".to_string(),
            scene_number: Some(scene.scene_number),
            int_ext: Some(scene.int_ext.clone()),
            day_night: Some(scene.day_night.clone()),
            set_name: Some(scene.setting.clone()),
            running_time: Some(scene.timecode.clone()),
            pages: Some(scene.pages_formatted.clone()),
            eighths: Some(scene.eighths),
            story_day: Some(scene.scene_number as u32 / 3 + 1),
            scheduled_duration: Some(format!("{:02}:00", (scene.eighths as f32 / 8.0 * 2.0).ceil() as u32)),
            characters: scene.characters.clone(),
            time_of_day: Some(if scene.day_night == "NIGHT" { "21:00".to_string() } else { "09:00".to_string() }),
            banner_title: None,
            banner_date: None,
            banner_total_pages: None,
        });
    }

    strips
}
`;

export const RUST_EXPORT_RS = `// Multi-format script exporter in Rust
use crate::screenplay::{ElementType, ScreenplayElement};

pub fn generate_fdx_xml(title: &str, author: &str, elements: &[ScreenplayElement]) -> String {
    let mut fdx = String::new();
    fdx.push_str("<?xml version=\\"1.0\\" encoding=\\"UTF-8\\" standalone=\\"no\\" ?>\\n");
    fdx.push_str("<FinalDraft DocumentType=\\"Script\\" Template=\\"No\\" Version=\\"1\\">\\n");
    fdx.push_str("  <Content>\\n");

    for el in elements {
        let fdx_type = match el.element_type {
            ElementType::SceneHeading => "Scene Heading",
            ElementType::Character => "Character",
            ElementType::Dialogue => "Dialogue",
            ElementType::Parenthetical => "Parenthetical",
            ElementType::Transition => "Transition",
            ElementType::Shot => "Shot",
            _ => "Action",
        };

        let safe_text = el.text
            .replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;");

        fdx.push_str(&format!("    <Paragraph Type=\\"{}\\\">\\n      <Text>{}</Text>\\n    </Paragraph>\\n", fdx_type, safe_text));
    }

    fdx.push_str("  </Content>\\n");
    fdx.push_str("</FinalDraft>");
    fdx
}
`;

export const GITHUB_ACTIONS_CI = `name: Build Desktop Installers (Windows, macOS, Linux)

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

jobs:
  build-tauri:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'windows-latest'
            args: ''
            target: 'x86_64-pc-windows-msvc'
            artifact: '*.exe, *.msi'
          - platform: 'macos-latest'
            args: '--target universal-apple-darwin'
            target: 'universal-apple-darwin'
            artifact: '*.dmg, *.app'
          - platform: 'ubuntu-22.04'
            args: ''
            target: 'x86_64-unknown-linux-gnu'
            artifact: '*.deb, *.AppImage'

    runs-on: \${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Rust Stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: \${{ matrix.target }}

      - name: Install Linux System Dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

      - name: Install Frontend Dependencies
        run: npm ci

      - name: Build Desktop Executable
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: app-v__VERSION__
          releaseName: 'ScreenCraft Desktop v__VERSION__'
          releaseBody: 'Cross-platform native installer for Windows, macOS, and Linux.'
          releaseDraft: true
          prerelease: false
          args: \${{ matrix.args }}
`;

export const README_DESKTOP_BUILD = `# ScreenCraft Desktop - Rust & Tauri Native Installer Suite

This repository contains the complete cross-platform desktop application source for **ScreenCraft**, written in **Rust** using the **Tauri v2** framework and modern high-fidelity React frontend.

## Target Installer Outputs:
- **Windows**: \`.exe\` (NSIS setup installer) and \`.msi\` (WiX enterprise installer)
- **macOS**: \`.dmg\` (Apple Disk Image) and \`.app\` (Universal Intel + Apple Silicon binary)
- **Linux**: \`.deb\` (Debian/Ubuntu) and \`.AppImage\` (Universal Linux standalone binary)

## Prerequisites:
1. **Rust**: Install via \`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh\`
2. **Node.js**: Version 18+ and npm

### System Specific Dependencies:
- **Windows**: C++ Build Tools (via Visual Studio Installer)
- **macOS**: Xcode Command Line Tools (\`xcode-select --install\`)
- **Linux**: \`sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev\`

## Quick Start (Development Mode):
\`\`\`bash
# 1. Install npm packages
npm install

# 2. Run desktop dev server with live native Rust bridge
npm run tauri dev
\`\`\`

## Compile Production Installers:
\`\`\`bash
# Compile for current platform (creates .exe/.msi on Windows, .dmg on Mac, .deb/.AppImage on Linux)
npm run tauri build
\`\`\`

The compiled binaries and installers will be located in:
\`src-tauri/target/release/bundle/\`
`;

export async function generateRustDesktopZip(project: StoryProject): Promise<Blob> {
  const zip = new JSZip();

  // Root files
  zip.file('README.md', README_DESKTOP_BUILD);
  zip.file('.github/workflows/build-desktop.yml', GITHUB_ACTIONS_CI);

  // Tauri / Rust directory
  const tauriFolder = zip.folder('src-tauri')!;
  tauriFolder.file('Cargo.toml', RUST_CARGO_TOML);
  tauriFolder.file('tauri.conf.json', RUST_TAURI_CONF);

  const rustSrc = tauriFolder.folder('src')!;
  rustSrc.file('main.rs', RUST_MAIN_RS);
  rustSrc.file('screenplay.rs', RUST_SCREENPLAY_RS);
  rustSrc.file('scheduler.rs', RUST_SCHEDULER_RS);
  rustSrc.file('export.rs', RUST_EXPORT_RS);

  // Include project JSON sample
  zip.file('active_script.story.json', JSON.stringify(project, null, 2));

  return await zip.generateAsync({ type: 'blob' });
}
