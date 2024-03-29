package simulation;

import data.Camp;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import simulation.KPIManager;

import java.io.FileOutputStream;
import java.io.IOException;

import data.Item;


public class ExcelReportGenerator {

    public ExcelReportGenerator(KPIManager kpiManager) {
        String filename = "KPI_Report.xlsx";
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet overallSheet = workbook.createSheet("Overall Report");
            createOverallTable(overallSheet, kpiManager);

            Sheet centralSheet = workbook.createSheet("Central Depot Report");
            createCentralTable(centralSheet, kpiManager);

            Sheet sheet = workbook.createSheet("Camp Report");
            createKpiTable(sheet, kpiManager);

            FileOutputStream fileOut = new FileOutputStream(filename);
            workbook.write(fileOut);
            fileOut.close();
            System.out.println("Excel file has been generated successfully!");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void createKpiTable(Sheet sheet, KPIManager kpiManager) {
        Row headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("Camp Name");
        headerRow.createCell(1).setCellValue("Item Name");
        headerRow.createCell(2).setCellValue("Total Item Purchase Cost");
        headerRow.createCell(3).setCellValue("Total Item Consumed");
        headerRow.createCell(4).setCellValue("Deprivation Cost");
        headerRow.createCell(5).setCellValue("Deprived Population");
        headerRow.createCell(6).setCellValue("Average Deprivation Time for Deprived Population");
        headerRow.createCell(7).setCellValue("Holding Cost");
        headerRow.createCell(8).setCellValue("Referral Cost");
        headerRow.createCell(9).setCellValue("Total Referral Population");
        headerRow.createCell(10).setCellValue("Expired Inventory");

        int rowNum = 1;
        for (Camp camp : kpiManager.totalDeprivationCost.keySet()) {
            for (Item item : kpiManager.totalDeprivationCost.get(camp).keySet()) {
                Row dataRow = sheet.createRow(rowNum++);
                dataRow.createCell(0).setCellValue(camp.getName());
                dataRow.createCell(1).setCellValue(item.getName());
                dataRow.createCell(2).setCellValue(kpiManager.campReplenishmentCost.get(camp).get(item));
                dataRow.createCell(3).setCellValue((int) (kpiManager.campReplenishmentCost.get(camp).get(item) / item.getPrice()));
                dataRow.createCell(4).setCellValue(kpiManager.totalDeprivationCost.get(camp).get(item));
                dataRow.createCell(5).setCellValue(kpiManager.totalDeprivedPopulation.get(camp).get(item));
                dataRow.createCell(6).setCellValue(kpiManager.averageDeprivationTime.get(camp).get(item));
                dataRow.createCell(7).setCellValue(kpiManager.totalHoldingCost.get(camp).get(item));
                dataRow.createCell(8).setCellValue(kpiManager.totalReferralCost.get(camp).get(item));
                dataRow.createCell(9).setCellValue(kpiManager.totalReferralCost.get(camp).get(item) / item.getReferralCost());
                dataRow.createCell(10).setCellValue(kpiManager.totalExpiredInventory.get(camp).get(item));
            }
        }
    }

    private void createOverallTable(Sheet sheet, KPIManager kpiManager) {
        Row headerRow = sheet.createRow(0);

        headerRow.createCell(0).setCellValue("Total Ordering Cost");
        headerRow.createCell(1).setCellValue("Total Deprivation Cost");
        headerRow.createCell(2).setCellValue("Total Holding Cost");
        headerRow.createCell(3).setCellValue("Total Referral Cost");
        headerRow.createCell(4).setCellValue("Objective Function Value");
        headerRow.createCell(5).setCellValue("Total Funding Spent");

        int rowNum = 1;
        Row dataRow = sheet.createRow(1);
        dataRow.createCell(0).setCellValue(Math.round(kpiManager.totalOrderingCostSum));
        dataRow.createCell(1).setCellValue(Math.round(kpiManager.totalDeprivationCostSum));
        dataRow.createCell(2).setCellValue(Math.round(kpiManager.totalHoldingCostSum));
        dataRow.createCell(3).setCellValue(Math.round(kpiManager.totalReferralCostSum));
        var value = kpiManager.totalOrderingCostSum + kpiManager.totalDeprivationCostSum + kpiManager.totalHoldingCostSum + kpiManager.totalReferralCostSum;
        dataRow.createCell(4).setCellValue(Math.round(value));
        dataRow.createCell(5).setCellValue(Math.round(kpiManager.totalFundingSpent));
    }

    private void createCentralTable(Sheet sheet, KPIManager kpiManager) {
        Row headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("Metric");

        int colNum = 1; // Starting column number

        // Create headers for each item
        for (Item item : kpiManager.totalReplenishmentCost.keySet()) {
            headerRow.createCell(colNum).setCellValue(item.getName());
            colNum++;
        }

        String[] metrics = {
                "Total Item Replenishment Cost",
                "Total Item Purchased",
                "Total Item Ordering Cost",
                "Total Number of Replenishment",
                "Total Item Deprivation Cost",
                "Total Item Deprived Population",
                "Total Item Average Deprivation Time",
                "Total Item Holding Cost",
                "Total Item Referral Cost",
                "Total Item Referral Population",
                "Total Central Item Expired Inventory",
                "Total Item Expired Inventory"
        };

        for (int i = 0; i < metrics.length; i++) {
            Row dataRow = sheet.createRow(i + 1);
            dataRow.createCell(0).setCellValue(metrics[i]);

            colNum = 1; // Starting column number
            for (Item item : kpiManager.totalReplenishmentCost.keySet()) {
                switch (i) {
                    case 0:
                        dataRow.createCell(colNum).setCellValue(kpiManager.totalReplenishmentCost.get(item));
                        break;
                    case 1:
                        dataRow.createCell(colNum).setCellValue((int) (kpiManager.totalReplenishmentCost.get(item) / item.getPrice()));
                        break;
                    case 2:
                        dataRow.createCell(colNum).setCellValue(kpiManager.totalOrderingCost.get(item));
                        break;
                    case 3:
                        dataRow.createCell(colNum).setCellValue((int) (kpiManager.totalOrderingCost.get(item) / item.getOrderingCost()));
                        break;
                    case 4:
                        double totalDeprivationCost = 0.0;
                        for (Camp camp : kpiManager.totalDeprivationCost.keySet()) {
                            totalDeprivationCost += kpiManager.totalDeprivationCost.get(camp).get(item);
                        }
                        dataRow.createCell(colNum).setCellValue(totalDeprivationCost);
                        break;
                    case 5:
                        int totalDeprivedPopulation = 0;
                        for (Camp camp : kpiManager.totalDeprivedPopulation.keySet()) {
                            totalDeprivedPopulation += kpiManager.totalDeprivedPopulation.get(camp).get(item);
                        }
                        dataRow.createCell(colNum).setCellValue(totalDeprivedPopulation);
                        break;
                    case 6:
                        double totalAverageDeprivationTime = 0.0;
                        int totalPopulation = 0;
                        for (Camp camp : kpiManager.averageDeprivationTime.keySet()) {
                            totalAverageDeprivationTime += kpiManager.averageDeprivationTime.get(camp).get(item) * kpiManager.totalDeprivedPopulation.get(camp).get(item);
                            totalPopulation += kpiManager.totalDeprivedPopulation.get(camp).get(item);
                        }
                        dataRow.createCell(colNum).setCellValue(totalAverageDeprivationTime / totalPopulation);
                        break;
                    case 7:
                        double totalHoldingCostItem = 0.0;
                        for (Camp camp : kpiManager.totalHoldingCost.keySet()) {
                            totalHoldingCostItem += kpiManager.totalHoldingCost.get(camp).get(item);
                        }
                        dataRow.createCell(colNum).setCellValue(totalHoldingCostItem);
                        break;
                    case 8:
                        double totalReferralCostItem = 0.0;
                        for (Camp camp : kpiManager.totalReferralCost.keySet()) {
                            totalReferralCostItem += kpiManager.totalReferralCost.get(camp).get(item);
                        }
                        dataRow.createCell(colNum).setCellValue(totalReferralCostItem);
                        break;
                    case 9:
                        double totalReferralPopulation = 0.0;
                        for (Camp camp : kpiManager.totalReferralCost.keySet()) {
                            totalReferralPopulation += kpiManager.totalReferralCost.get(camp).get(item) / item.getReferralCost();
                        }
                        dataRow.createCell(colNum).setCellValue(totalReferralPopulation);
                        break;
                    case 10:
                        dataRow.createCell(colNum).setCellValue(kpiManager.totalCentralExpiredInventory.get(item));
                        break;
                    case 11:
                        double totalExpiredInventory = 0.0;
                        for (Camp camp : kpiManager.totalExpiredInventory.keySet()) {
                            totalExpiredInventory += kpiManager.totalExpiredInventory.get(camp).get(item);
                        }
                        dataRow.createCell(colNum).setCellValue(totalExpiredInventory);
                        break;
                    default:
                        break;
                }
                colNum++;
            }
        }
    }

}
