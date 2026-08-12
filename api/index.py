"""
=============================================================================
Vercel Serverless Function Entry Point
=============================================================================
Routes incoming Vercel serverless requests to the main Flask application instance.
"""

from app import app

# Export WSGI application instance for Vercel Python runtime
app = app
