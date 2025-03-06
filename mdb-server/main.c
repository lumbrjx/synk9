#include <modbus/modbus.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main() {
  modbus_t *ctx;
  modbus_mapping_t *mb_mapping;

  ctx = modbus_new_tcp("0.0.0.0", 502);
  if (ctx == NULL) {
    fprintf(stderr, "Unable to create Modbus context\n");
    return -1;
  }

  modbus_set_debug(ctx, TRUE);
  // Create a mapping for registers
  mb_mapping =
      modbus_mapping_new(600, 0, 600, 0); // 600 coils, 100 holding registers
  if (mb_mapping == NULL) {
    fprintf(stderr, "Failed to allocate mapping\n");
    modbus_free(ctx);
    return -1;
  }

  mb_mapping->tab_registers[0] = 1;
  mb_mapping->tab_registers[1] = 2;
  mb_mapping->tab_registers[2] = 3;

  int socket = modbus_tcp_listen(ctx, 1);
  if (socket == -1) {
    fprintf(stderr, "Failed to listen\n");
    modbus_free(ctx);
    return -1;
  }

  printf("Modbus TCP server started on port 502\n");

  while (1) {
    int client_socket = modbus_tcp_accept(ctx, &socket);
    if (client_socket == -1) {
      continue;
    }

    uint8_t query[MODBUS_TCP_MAX_ADU_LENGTH];
    int rc;
    while ((rc = modbus_receive(ctx, query)) != -1) {
      modbus_reply(ctx, query, rc, mb_mapping);
    }

    close(client_socket);
  }

  modbus_mapping_free(mb_mapping);
  modbus_close(ctx);
  modbus_free(ctx);

  return 0;
}
