const express = require("express");
const app = express();

app.use(express.static(__dirname, { dotfiles: 'allow' }));

app.listen(80, () => {
    console.log('HTTP server for certbot renewal running on port 80!');
});
