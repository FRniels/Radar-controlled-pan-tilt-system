# Notes
Flask is used as a (unsafe) python webserver.
Flask requires the served html page to be located in a folder ./templates
All files that are included like css and js need to be located in a folder ./static

The files can be linked from the html file like this:
<link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
<script src="{{ url_for('static', filename='script.js') }}"></script>

(Flask can be configure otherwise but this is the default behaviour)