CC=g++
CFLAGS=-Wall -g
TARGET=web_server

all: $(TARGET)

$(TARGET): $(TARGET).cpp
	$(CC) $(CFLAGS) -o $(TARGET) $(TARGET).cpp

clean:
	rm -f $(TARGET)