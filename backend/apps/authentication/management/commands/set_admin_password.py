"""Django management command to update an admin's password and revoke active sessions."""

import getpass
from django.core.management.base import BaseCommand, CommandError
from apps.authentication.services import ADMIN_PASSWORD_MIN_LENGTH, set_admin_new_password


class Command(BaseCommand):
    help = "Update an administrator password and revoke all active sessions."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--mobile",
            type=str,
            required=True,
            help="10-digit Indian mobile number for the admin.",
        )

    def handle(self, *args, **options) -> None:
        mobile = options["mobile"]
        self.stdout.write(f"Updating password for admin mobile: {mobile}")

        # Secure interactive password input - never accept password via CLI flag
        password = getpass.getpass("Enter new password: ")
        password_confirm = getpass.getpass("Confirm new password: ")

        if password != password_confirm:
            raise CommandError("Passwords do not match.")

        if len(password) < ADMIN_PASSWORD_MIN_LENGTH:
            raise CommandError(
                f"Password must be at least {ADMIN_PASSWORD_MIN_LENGTH} characters."
            )

        try:
            set_admin_new_password(mobile=mobile, new_password=password)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully updated password and revoked all sessions for admin '{mobile}'."
                )
            )
        except Exception as e:
            raise CommandError(str(e)) from e
