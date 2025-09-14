import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedData } from './types';
import { logger } from './logger';

export class WebScraper {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async scrapeExamDates(): Promise<ScrapedData | null> {
    try {
      logger.debug(`Fetching page: ${this.url}`);

      const response = await axios.get(this.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // Look for the specific table row with exam dates
      const examRow = $('tr.row-2.even');

      if (examRow.length === 0) {
        logger.warn('Could not find exam date row with selector: tr.row-2.even');
        return null;
      }

      const firstColumn = examRow.find('td.column-1');
      const rawText = firstColumn.text().trim();

      logger.debug('Raw text from first column:', rawText);

      // Extract exam date and application deadline using regex
      // Find the line that contains exam date pattern and deadline
      const lines = rawText.split('\n');
      const targetLine = lines.find(line =>
        line.includes('--') &&
        line.includes('Son Başvuru') &&
        line.match(/\d{1,2}\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+\s+\d{4},\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+/) &&
        line.match(/Son Başvuru ve Belge YüklemeTarihi:\s*\d{1,2}\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+\s+\d{4},\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+/)
      );

      if (!targetLine) {
        logger.warn('Could not find target line with dates:', rawText);
        return null;
      }

      // Split the target line by " - " to separate exam date from deadline
      const parts = targetLine.split(' - ');
      if (parts.length < 2) {
        logger.warn('Could not split target line by " - ":', targetLine);
        return null;
      }

      const examDateMatch = parts[0].match(/--\s*(\d{1,2}\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+\s+\d{4},\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+)/);
      const deadlineMatch = rawText.match(/Son Başvuru ve Belge YüklemeTarihi:\s*(\d{1,2}\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+\s+\d{4},\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+)/);

      if (!examDateMatch || !deadlineMatch) {
        logger.warn('Could not extract dates from text:', rawText);
        return null;
      }

      const examDate = examDateMatch[1].trim();
      const applicationDeadline = deadlineMatch[1].trim();

      logger.info(`Extracted exam date: ${examDate}`);
      logger.info(`Extracted application deadline: ${applicationDeadline}`);

      return {
        examDate,
        applicationDeadline,
        rawText
      };

    } catch (error) {
      logger.error('Error scraping website:', error);
      return null;
    }
  }

  // Alternative method to extract dates if the first method fails
  async scrapeExamDatesAlternative(): Promise<ScrapedData | null> {
    try {
      logger.debug('Trying alternative scraping method');

      const response = await axios.get(this.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // Look for any table that might contain the exam dates
      const tables = $('table');
      let foundData: ScrapedData | null = null;

      for (let i = 0; i < tables.length; i++) {
        if (foundData) break;

        const $table = $(tables[i]);
        const rows = $table.find('tr');

        for (let j = 0; j < rows.length; j++) {
          if (foundData) break;

          const $row = $(rows[j]);
          const text = $row.text();

          // Check if this row contains exam date information
          if (text.includes('--') && text.includes('Son Başvuru') &&
            text.match(/\d{1,2}\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+\s+\d{4},\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+/) &&
            text.match(/Son Başvuru ve Belge YüklemeTarihi:\s*\d{1,2}\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+\s+\d{4},\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+/)) {
            // Split by " - " to separate exam date from deadline
            const parts = text.split(' - ');
            if (parts.length >= 2) {
              const examDateMatch = parts[0].match(/--\s*(\d{1,2}\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+\s+\d{4},\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+)/);
              const deadlineMatch = text.match(/Son Başvuru ve Belge YüklemeTarihi:\s*(\d{1,2}\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+\s+\d{4},\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+)/);

              if (examDateMatch && deadlineMatch) {
                foundData = {
                  examDate: examDateMatch[1].trim(),
                  applicationDeadline: deadlineMatch[1].trim(),
                  rawText: text.trim()
                };
                break;
              }
            }
          }
        }
      }

      if (foundData) {
        logger.info(`Alternative method found exam date: ${foundData.examDate}`);
        logger.info(`Alternative method found deadline: ${foundData.applicationDeadline}`);
      }

      return foundData;

    } catch (error) {
      logger.error('Error in alternative scraping method:', error);
      return null;
    }
  }
}
