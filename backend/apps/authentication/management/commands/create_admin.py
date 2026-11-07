"""Django management command to interactively create a new administrator."""

import getpass
from django.core.management.base import BaseCommand, CommandError
from apps.authentication.services import ADMIN_PASSWORD_MIN_LENGTH, create_admin_account


class Command(BaseCommand):
    help = "Create a new administrator account with interactive password prompt."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--mobile",
            type=str,
            required=True,
            help="10-digit Indian mobile number for the admin.",
        )

    def handle(self, *args, **options) -> None:
        mobile = options["mobile"]
        self.stdout.write(f"Creating administrator for mobile: {mobile}")

        # Secure interactive password input - never accept password via CLI flag
        password = getpass.getpass("Enter password: ")
        password_confirm = getpass.getpass("Confirm password: ")

        if password != password_confirm:
            raise CommandError("Passwords do not match.")

        if len(password) < ADMIN_PASSWORD_MIN_LENGTH:
            raise CommandError(
                f"Password must be at least {ADMIN_PASSWORD_MIN_LENGTH} characters."
            )

        try:
            admin = create_admin_account(mobile=mobile, raw_password=password)
            self.stdout.write(
                self.style.SUCCESS(f"Successfully created admin with ID {admin['_id']}")
            )
        except Exception as e:
            raise CommandError(str(e)) from e
