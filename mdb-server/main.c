#include <modbus/modbus.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

modbus_mapping_t *mb_mapping;

void *update_registers(void *arg) {
  while (1) {
    mb_mapping->tab_registers[512] = rand() % 1000; // Register 513
    mb_mapping->tab_registers[513] = rand() % 1000; // Register 514
    printf("Updated: 513=%d, 514=%d\n", mb_mapping->tab_registers[512], mb_mapping->tab_registers[513]);
    sleep(1);
  }
  return NULL;
}

int main() {
  modbus_t *ctx = modbus_new_tcp("0.0.0.0", 502);
  if (ctx == NULL) {
    fprintf(stderr, "Unable to create Modbus context\n");
    return -1;
  }

  modbus_set_debug(ctx, TRUE);

  mb_mapping = modbus_mapping_new(0, 0, 600, 0); // 600 holding registers
  if (mb_mapping == NULL) {
    fprintf(stderr, "Failed to allocate mapping\n");
    modbus_free(ctx);
    return -1;
  }

  pthread_t updater_thread;
  pthread_create(&updater_thread, NULL, update_registers, NULL);

  int server_socket = modbus_tcp_listen(ctx, 1);
  if (server_socket == -1) {
    fprintf(stderr, "Failed to listen\n");
    modbus_mapping_free(mb_mapping);
    modbus_free(ctx);
    return -1;
  }

  while (1) {
    int client_socket = modbus_tcp_accept(ctx, &server_socket);
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

