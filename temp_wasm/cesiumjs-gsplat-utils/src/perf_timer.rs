use std::time::{Duration, Instant};
use std::collections::HashMap;
use std::fmt;

#[derive(Debug)]
pub struct Timer {
    start: Instant,
    splits: HashMap<String, Duration>,
    last_split: Instant,
}

impl Timer {
    pub fn new() -> Self {
        let now = Instant::now();
        Timer {
            start: now,
            splits: HashMap::new(),
            last_split: now,
        }
    }

    pub fn split(&mut self, name: &str) {
        let now = Instant::now();
        let duration = now.duration_since(self.last_split);
        self.splits.insert(name.to_string(), duration);
        self.last_split = now;
    }

    pub fn elapsed(&self) -> Duration {
        Instant::now().duration_since(self.start)
    }

    pub fn get_split(&self, name: &str) -> Option<Duration> {
        self.splits.get(name).copied()
    }

    pub fn reset(&mut self) {
        let now = Instant::now();
        self.start = now;
        self.last_split = now;
        self.splits.clear();
    }
}

impl fmt::Display for Timer {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Total time: {:?}", self.elapsed())?;
        writeln!(f, "\nSplits:")?;
        for (name, duration) in &self.splits {
            writeln!(f, "{}: {:?}", name, duration)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;

    #[test]
    fn test_basic_timing() {
        let mut timer = Timer::new();
        
        // Simulate some work
        sleep(Duration::from_millis(100));
        timer.split("first_operation");
        
        sleep(Duration::from_millis(50));
        timer.split("second_operation");
        
        assert!(timer.get_split("first_operation").unwrap().as_millis() >= 100);
        assert!(timer.get_split("second_operation").unwrap().as_millis() >= 50);
        assert!(timer.elapsed().as_millis() >= 150);
    }
}