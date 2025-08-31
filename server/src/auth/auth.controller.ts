import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // GitHub OAuth will handle the redirect
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(@Req() req, @Res() res) {
    const user = await this.authService.validateGithubUser(req.user);
    const result = await this.authService.login(user);
    
    // Redirect to a success page that can communicate with the extension
    const successUrl = `http://localhost:4000/auth/success?token=${result.access_token}`;
    res.redirect(successUrl);
  }

  @Get('success')
  async authSuccess(@Req() req, @Res() res) {
    const token = req.query.token;
    if (!token) {
      return res.status(400).send('No token provided');
    }

    // Return a simple HTML page that can communicate with the extension
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GitTalk - Authentication Successful</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f6f8fa; 
          }
          .container { 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            max-width: 400px; 
            margin: 0 auto; 
          }
          .success { color: #2ea44f; font-size: 24px; margin-bottom: 20px; }
          .message { color: #656d76; margin-bottom: 20px; }
          .close { 
            background: #2ea44f; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅ Authentication Successful!</div>
          <div class="message">You have been successfully logged in to GitTalk.</div>
          <div class="message">You can now close this window and return to GitHub to start chatting.</div>
          <button class="close" onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Store the token in localStorage so the extension can access it
          localStorage.setItem('gittalk_token', '${token}');
          
          // Try to communicate with the extension if it's open
          if (window.opener && window.opener.postMessage) {
            window.opener.postMessage({ 
              type: 'GITTALK_AUTH_SUCCESS', 
              token: '${token}' 
            }, '*');
          }
          
          // Close the window after a short delay
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    const user = await this.usersService.findById(req.user.sub);
    return {
      id: user.id,
      login: user.login,
      avatarUrl: user.avatarUrl,
    };
  }
}
