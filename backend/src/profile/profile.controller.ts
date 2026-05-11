import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profile: ProfileService) {}

  @Get()
  get(@Request() req) {
    return this.profile.get(req.user.id);
  }

  @Patch()
  update(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.profile.update(req.user.id, dto);
  }
}
