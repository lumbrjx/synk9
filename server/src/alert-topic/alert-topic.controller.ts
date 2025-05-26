import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AlertTopicService } from './alert-topic.service';
import { CreateAlertTopicDto } from './dto/create-alert-topic.dto';
import { UpdateAlertTopicDto } from './dto/update-alert-topic.dto';

@Controller('alert-topic')
export class AlertTopicController {
  constructor(private readonly alertTopicService: AlertTopicService) {}

  @Post()
  create(@Body() createAlertTopicDto: CreateAlertTopicDto) {
    return this.alertTopicService.create(createAlertTopicDto);
  }

  @Get()
  findAll() {
    return this.alertTopicService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alertTopicService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAlertTopicDto: UpdateAlertTopicDto) {
    return this.alertTopicService.update(id, updateAlertTopicDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.alertTopicService.remove(id);
  }
}
