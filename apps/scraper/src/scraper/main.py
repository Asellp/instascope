from scraper.logging_config import configure_logging
from scraper.scraper_service import ScraperService


def main():

    configure_logging()

    service = ScraperService()

    result = service.scrape("sercankahvci")

    print("\n")

    print("=" * 50)
    print("SCRAPING BAŞARILI")
    print("=" * 50)

    print(result.profile)

    print()

    print(f"Post sayısı : {result.total_posts}")

    print(f"Yorum sayısı : {result.total_comments}")

    print()

    if result.posts:

        print("İlk post")

        print(result.posts[0])

    if result.comments:

        print()

        print("İlk yorum")

        print(result.comments[0])


if __name__ == "__main__":
    main()