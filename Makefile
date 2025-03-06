.PHONY: build-mdb-server install-mdb-server-deps

install-mdb-server-deps:
	sudo apt install libmodbus-dev

build-mdb-server:
	cd mdb-server && gcc main.c -o main -lmodbus

