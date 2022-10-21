use rustyline::{Editor, Config};

fn make_repl() {
    let config = Config::builder().completion_type(rustyline::CompletionType::Circular).max_history_size(0).build();
    let mut editor = Editor::();
}