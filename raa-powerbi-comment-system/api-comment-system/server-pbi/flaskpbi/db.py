import sqlite3

import click
from flask import current_app, g
from flask.cli import with_appcontext

import csv

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    db = g.pop('db', None)

    if db is not None:
        db.close()

def init_db():
    db = get_db()

    with current_app.open_resource('schema.sql') as f:
        db.executescript(f.read().decode('utf-8'))

@click.command('init-db')
@with_appcontext
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

@click.command('export-csv')
@with_appcontext
def export_csv_command():
    """Export the existing data to csv"""

    export_data = get_db().execute(
        'SELECT id, key_value, body, comment_status'
        '   FROM comment'
        '   WHERE comment_status = ?',
        ('published',)
    ).fetchall()

    with open('output.csv', 'w') as output:
        writer = csv.writer(output)
        writer.writerow(['id', 'key_value', 'body', 'comment_status'])
        writer.writerows(export_data)
    click.echo('Exported the database.')

def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
    app.cli.add_command(export_csv_command)

