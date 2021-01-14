from flask import Blueprint, redirect, url_for, make_response, jsonify, request
from flaskpbi.db import get_db

import csv

bp = Blueprint('comment', __name__, url_prefix='/comment')

def get_comment_server(key_value):
    comment = get_db().execute(
        'SELECT body, comment_status'
        '   FROM comment'
        '   WHERE key_value = ?',
        (key_value,)
    ).fetchone()

    if comment == None:
        print('GET METHOD - COMMENT "{}" DOES NOT EXIST'.format(key_value))
        return {'body': '...', 'status': 'new'}

    print('GET METHOD - COMMENT "{}" EXISTS'.format(key_value))
    return {'body': comment['body'], 'status': comment['comment_status']}

@bp.route('/get/<string:key_value>', methods=['GET'])
def get_comment(key_value):
    print('GET Request')
    return make_response((get_comment_server(key_value), {'Access-Control-Allow-Origin': '*'}))



@bp.route('/post/<string:key_value>/<string:status>', methods=['POST'])
def post_comment(key_value, status):
    print('POST Request')
    db = get_db()
    comment_id = db.execute(
        'SELECT id'
        '   FROM comment'
        '   WHERE key_value = ?',
        (key_value,)
    ).fetchone()

    body = request.get_data().decode()
    print('Body>')
    print(body)

    if status == 'post':
        status = 'updated'
    elif status == 'publish':
        status = 'published'

    # SQL Injection --> Need to Check
    if comment_id == None:
        print('POST COMMENT - COMMENT "{}" DOES NOT EXIST'.format(key_value))
        db.execute(
            'INSERT INTO comment (key_value, body, comment_status)'
            '   VALUES (?, ?, ?)',
            (key_value, body, status)
        )
        db.commit()
    else:
        print('POST COMMENT - COMMENT "{}" EXISTS'.format(key_value))
        db.execute(
            'UPDATE comment SET body = ?, comment_status = ?'
            '   WHERE key_value = ?',
            (body, status, key_value)
        )
        db.commit()

    # Export to CSV if new publication
    if status == 'published':
        print('Write output in csv')
        export_data = db.execute(
            'SELECT id, key_value, body, comment_status'
            '   FROM comment'
            '   WHERE comment_status = ?',
            ('published',)
        ).fetchall()

        with open('output.csv', 'w') as output:
            writer = csv.writer(output)
            writer.writerow(['id', 'key_value', 'body', 'comment_status'])
            writer.writerows(export_data)

    return make_response((get_comment_server(key_value), {'Access-Control-Allow-Origin': '*'}))

# @bp.route('/post/<string:key_value>/<string:body>', methods=['POST'])
# def post_comment(key_value, body):
#     print('POST Request')
#     db = get_db()
#     comment_id = db.execute(
#         'SELECT id'
#         '   FROM comment'
#         '   WHERE key_value = ?',
#         (key_value,)
#     ).fetchone()

#     if comment_id == None:
#         print('POST COMMENT - COMMENT "{}" DOES NOT EXIST'.format(key_value))
#         db.execute(
#             'INSERT INTO comment (key_value, body)'
#             '   VALUES (?, ?)',
#             (key_value, body)
#         )
#         db.commit()
#     else:
#         print('POST COMMENT - COMMENT "{}" EXISTS'.format(key_value))
#         db.execute(
#             'UPDATE comment SET body = ?'
#             '   WHERE key_value = ?',
#             (body, key_value)
#         )
#         db.commit()

#     return make_response(get_comment_server(key_value), {'Access-Control-Allow-Origin': '*'})
    