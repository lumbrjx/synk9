package main

import (
	"fmt"
	"log"
	"os"

	"github.com/robinson/gos7"
)

func main() {
	// Pass IP address, local TSAP, and remote TSAP as separate parameters
	handler := gos7.NewTCPClientHandler(
		"3.124.67.191:13122", 0, 2,
	)

	handler.Logger = log.New(os.Stdout, "tcp: ", log.LstdFlags)
	err := handler.Connect()
	if err != nil {
		panic(err)
	}
	defer handler.Close()

	client := gos7.NewClient(handler)

	// Example: Read 4 bytes from DB1, starting at byte 0
	buffer := make([]byte, 4)
	err = client.AGReadDB(1, 0, 4, buffer)
	if err != nil {
		panic(err)
	}

	fmt.Printf("DB1:0-3 = %v\n", buffer)
}
