package simulation;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import data.Camp;
import data.Environment;
import data.Item;


public class ExcelReportGenerator {

    public ExcelReportGenerator(KPIManager kpiManager) {
        String filename = kpiManager.fileName + ".xlsx";
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet overallSheet = workbook.createSheet("Overall Report");
            createOverallTable(overallSheet, kpiManager);

            Sheet centralSheet = workbook.createSheet("Central Depot Report");
            createCentralTable(centralSheet, kpiManager);

            Sheet sheet = workbook.createSheet("Camp Report");
            createKpiTable(sheet, kpiManager);

            Sheet verificationSheet = workbook.createSheet("Verification Report");
            createVerificationSheet(verificationSheet, kpiManager);

            File file = new File(filename);
            FileOutputStream fileOut = new FileOutputStream(file);
            workbook.write(fileOut);
            fileOut.close();
            System.out.println("Excel file has been generated successfully! Path: " + file.getAbsolutePath());
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /** Verification report: demand arrived per camp, total funding arrived, replenishment per camp and item. */
    private void createVerificationSheet(Sheet sheet, KPIManager kpiManager) {
        Environment env = kpiManager.getEnvironment();
        java.util.Set<Camp> camps = env != null ? new java.util.LinkedHashSet<>(java.util.Arrays.asList(env.getCamps())) : new java.util.LinkedHashSet<>();
        camps.addAll(kpiManager.totalInternalDemandArrived.keySet());
        camps.addAll(kpiManager.totalExternalDemandArrived.keySet());
        camps.addAll(kpiManager.replenishmentQuantityByCampItem.keySet());

        int rowNum = 0;

        // 1. Demand arrived per camp
        Row h1 = sheet.createRow(rowNum++);
        h1.createCell(0).setCellValue("Demand arrived per camp");
        rowNum++;
        Row demandHeader = sheet.createRow(rowNum++);
        demandHeader.createCell(0).setCellValue("Camp");
        demandHeader.createCell(1).setCellValue("Total Internal Arrived");
        demandHeader.createCell(2).setCellValue("Total External Arrived");
        for (Camp camp : camps) {
            Row r = sheet.createRow(rowNum++);
            r.createCell(0).setCellValue(camp.getName());
            r.createCell(1).setCellValue(kpiManager.totalInternalDemandArrived.getOrDefault(camp, 0));
            r.createCell(2).setCellValue(kpiManager.totalExternalDemandArrived.getOrDefault(camp, 0));
        }
        rowNum++;

        // 2. Total funding arrived
        Row h2 = sheet.createRow(rowNum++);
        h2.createCell(0).setCellValue("Total funding arrived to system");
        h2.createCell(1).setCellValue(kpiManager.totalFundingReceived);
        rowNum++;

        // 3. Replenishment per camp and item
        Row h3 = sheet.createRow(rowNum++);
        h3.createCell(0).setCellValue("Replenishment amount per camp and item");
        rowNum++;
        Row replHeader = sheet.createRow(rowNum++);
        replHeader.createCell(0).setCellValue("Camp");
        replHeader.createCell(1).setCellValue("Item");
        replHeader.createCell(2).setCellValue("Total Quantity");
        for (Camp camp : kpiManager.replenishmentQuantityByCampItem.keySet()) {
            for (Item item : kpiManager.replenishmentQuantityByCampItem.get(camp).keySet()) {
                Row r = sheet.createRow(rowNum++);
                r.createCell(0).setCellValue(camp.getName());
                r.createCell(1).setCellValue(item.getName());
                r.createCell(2).setCellValue(kpiManager.replenishmentQuantityByCampItem.get(camp).get(item));
            }
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
        headerRow.createCell(6).setCellValue("Average Deprivation Time (days) for Deprived Population");
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
                "Total Item Average Deprivation Time (days)",
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
