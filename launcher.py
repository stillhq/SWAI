import subprocess
import os
import sys

electron_app_path = os.path.join(os.path.dirname(__file__))
command = [os.path.join(electron_app_path, "node_modules/.bin/electron")]
command.extend(sys.argv[1:])
subprocess.Popen(command, start_new_session=True)