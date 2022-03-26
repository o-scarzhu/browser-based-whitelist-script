# whitelist-chat-script

Iterates through the buzzword.txt and types out the message and posts it to the server's channel.

copy the url of the server's channel -- in which you would like to start auto sending messages to -- in the url.txt
make a list of sentences or phrases in the buzzwords.txt. It will iterate through the list line by line

delays in between messages can be adjusted on the fly in the credentials.json. It will randomly choose and number between delay1 and delay2 values

You will need puppeteer for this script to work

Added a SQL DB for authentication purposes. Remove the SQL code to bypass the authenticating key event
