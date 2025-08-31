import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateGithubUser(profile: any) {
    const { id, username, photos } = profile;
    
    let user = await this.usersService.findByGithubId(id);
    
    if (!user) {
      user = await this.usersService.create({
        githubId: id.toString(),
        login: username,
        avatarUrl: photos?.[0]?.value,
      });
    }

    return user;
  }

  async login(user: any) {
    const payload = { sub: user.id, login: user.login };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        login: user.login,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
