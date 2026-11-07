"""Django management command to idempotently create all MongoDB indexes."""

from django.core.management.base import BaseCommand

from infrastructure.indexes import ensure_all_indexes


class Command(BaseCommand):
    help = "Idempotently ensure all required MongoDB indexes exist across collections."

    def handle(self, *args, **options) -> None:
        self.stdout.write("Ensuring MongoDB indexes...")
        created = ensure_all_indexes()
        for col_name, idx_list in created.items():
            self.stdout.write(
                self.style.SUCCESS(
                    f"Collection '{col_name}': {len(idx_list)} indexes created/verified ({', '.join(idx_list)})"
                )
            )
        self.stdout.write(self.style.SUCCESS("All indexes verified successfully."))
