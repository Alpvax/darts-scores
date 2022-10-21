use eframe::{
    egui::{self, CentralPanel, ComboBox},
    run_native, App,
};
use egui_extras::{TableBuilder, Size};

use crate::prelude::GameScore;

// struct ScoreWidget {
//     base_score: i16,
//     delta_mul: i16,
//     delta: Option<i16>,
// }
// impl ScoreWidget {
//     fn new(round: usize, score: i16) -> Self {
//         Self {
//             base_score: score,
//             delta_mul: round.try_into().unwrap(),
//             delta: None,
//         }
//     }
// }

// impl Widget for ScoreWidget {
//     fn ui(mut self, ui: &mut eframe::egui::Ui) -> eframe::egui::Response {
//         let i_response = ui.horizontal_centered(|row| {
//             row.label(
//                 self.delta
//                     .as_ref()
//                     .map(|d| format!("{}", self.base_score + d))
//                     .unwrap_or("".to_string()),
//             );
//             // row.vertical(|col| {
//             //     col.radio_value(
//             //         &mut self.delta,
//             //         Some(-self.delta_mul),
//             //         format!("{}", -self.delta_mul),
//             //     );
//             //     for h in 1..=3 {
//             //         col.radio_value(
//             //             &mut self.delta,
//             //             Some(h * self.delta_mul),
//             //             format!("{:+}", h * self.delta_mul),
//             //         );
//             //     }
//             // })
//             // row.
//         });
//         // i_response.inner | i_response.response
//         i_response.response
//     }
// }

struct GUI {
    game: crate::games::GameHolder,
}

impl App for GUI {
    fn update(&mut self, ctx: &eframe::egui::Context, frame: &mut eframe::Frame) {
        CentralPanel::default().show(ctx, |ui| {
            let text_size = egui::TextStyle::Body.resolve(ui.style()).size;
            /*let table = */TableBuilder::new(ui)
                .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
                .columns(Size::remainder(), self.game.column_count())
                .header(20.0, |mut head| {
                    head.col(|ui| { ui.heading("Round"); });
                    for player in self.game.scores().keys() {
                        head.col(|ui| { ui.heading(player.fun_name()); });
                    }
                })
                .body(|mut body| {
                    body.rows(text_size, 20, |i, mut row| {
                        let round = i + 1;
                        row.col(|col| { col.label(round.to_string()); } );
                        let options = core::iter::once(-1i8).chain(1..=3).map(|i| (i * <i8 as TryFrom<_>>::try_from(round).unwrap()).to_string()).chain(core::iter::once("".to_string())).collect::<Vec<_>>();
                        for score in self.game.scores_mut().values_mut() {
                            row.col(|col| {
                                col.add_visible_ui(score.current_round() > round, |cell| {
                                    cell.label(score.cumulative_score(round).to_string());
                                    if score.current_round() - round > 1 {
                                        let mut selected = 4;
                                        let combo = ComboBox::from_id_source("score_picker")
                                            .show_index(cell, &mut selected, 5, |i| options[i].clone());
                                        if combo.changed() && selected < 4 {
                                            score.with_turn(round, |turn| {
                                                turn.score_hits(selected.try_into().unwrap());
                                            });
                                        }
                                        // cell.add(combo);
                                        // ui.horizontal_centered(|ui| {
                                        //     ui.label(score.cumulative_score(round).to_string());
                                        //     ui.add(widget)
                                        // });
                                    }
                                });
                            });
                        }
                    });
                })
                // ;
            // ui.heading("Darts Scores Application");
            // ui.columns(self.game.column_count(), |cols| {
            //     cols[0].vertical(|ui| {
            //         ui.heading("Round");
            //         for round in 1..=20 {
            //             ui.label(format!("{}", round));
            //         }
            //     });
            //     for (i, (player, score)) in self.game.scores().iter().enumerate() {
            //         cols[i + 1].vertical(|ui| {
            //             ui.heading(player.fun_name());
            //             ui.add_visible(
            //                 score.current_round() >= i,
            //                 ScoreWidget::new(i + 1, score.cumulative_score(i + 1)),
            //             );
            //         });
            //     }
            // });
        });
    }
}

pub fn make_gui() {
    run_native(
        "Darts Scores",
        eframe::NativeOptions::default(),
        Box::new(|_| {
            use crate::player::Player::*;
            Box::new(GUI {
                game: crate::games::GameHolder::new_27([Matt, Mikael, Nick]),
            })
        }),
    )
}
