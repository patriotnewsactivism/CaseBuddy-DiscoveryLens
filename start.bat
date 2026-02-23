@echo off
echo Starting DiscoveryLens with PM2...
pm2 start ecosystem.config.js
echo.
echo App running at http://localhost:3000
echo.
echo Useful PM2 commands:
echo   pm2 status     - Check app status
echo   pm2 logs       - View logs
echo   pm2 stop all   - Stop all apps
echo   pm2 restart all - Restart all apps
pause