.PHONY: install test lint run clean

install:
	pip install -e ".[test]"

test:
	pytest tests/unit/ -v --cov --cov-report=term

lint:
	python -m py_compile cmd/diagd/main.py
	python -m py_compile core/event_bus.py
	python -m py_compile collectors/pcie.py

run:
	sudo python -m cmd.diagd.main --config config/default.yaml

check:
	sudo python -m cli.main check --pcie

clean:
	find . -name "__pycache__" -exec rm -rf {} +
	find . -name "*.pyc" -delete
	rm -rf .pytest_cache htmlcov .coverage
