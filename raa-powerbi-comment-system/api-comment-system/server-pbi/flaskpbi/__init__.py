import os

from flask import Flask, make_response, jsonify, request

# Documentation
# (be sure to have python correctly installed - with pip functionnal)
# venv/Scripts/activate
# $env:FLASK_APP = "flaskpbi"
# $env:FLASK_ENV = "development"
# flask run

# 0.0.0.0           (Local)
# 127.0.0.1         (Local)
# 172.29.134.132    (Ethernet)
# 172.29.146.134    (Wi-Fi)

def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATABASE=os.path.join(app.instance_path, 'flaskr.sqlite'),
    )

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # index page, just to mention what it is
    @app.route('/')
    def index():
        return make_response('Local API Server with Make Response and CORS.', {'Access-Control-Allow-Origin': '*'})

    # @app.route('/checkup.js')
    # def checkup():
    #     callback = request.args.get('callback') 
    #     print('Argument Callback: [{}]'.format(callback))
    #     if callback:
    #         output = 'alert("From Server");{}({});'.format(callback, 'Checkup received')
    #         return make_response(output, {'Access-Control-Allow-Origin': '*'})
    #     return jsonify(body='Local API Server with JSONify.')

    
       

    from . import db
    db.init_app(app)

    from . import comment
    app.register_blueprint(comment.bp)

    return app