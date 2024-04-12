import dotenv from "dotenv";
import AWS from "aws-sdk";
import inquirer from "inquirer";
import { promises as fs } from "fs";

dotenv.config();

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const s3 = new AWS.S3({
    signatureVersion: "v2",
});

const main = async () => {
    const answer = await inquirer.prompt({
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: ["List all files", "Upload a file", "List files by regex", "Delete files by regex", "Exit"],
    });
    console.clear();

    switch (answer.action) {
        case "List all files":
            await listFiles();
            break;
        case "Upload a file":
            await uploadFile();
            break;
        case "List files by regex":
            await listFilesByRegex();
            break;
        case "Delete files by regex":
            await deleteFilesByRegex();
            break;
        case "Exit":
            process.exit();
    }
};

const listFiles = async () => {
    const params = {
        Bucket: process.env.S3_BUCKET,
    };
    try {
        const data = await s3.listObjects(params).promise();
        const list = data?.Contents?.map((file) => file.Key);
        if (list) {
            console.log("Files: ", list);
        } else {
            console.log("Files not found... \n");
        }
    } catch (err) {
        console.error("Error listing files: ", err);
    }
    main();
};

const uploadFile = async () => {
    const answer = await inquirer.prompt([
        {
            type: "input",
            name: "filePath",
            message: "Enter path to the local file: ",
        },
        {
            type: "input",
            name: "targetKey",
            message: "Enter the target file key (including folder path): ",
        },
    ]);
    try {
        const fileContent = await fs.readFile(answer.filePath);
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: answer.targetKey,
            Body: fileContent,
        };
        const data = await s3.upload(params).promise();
        console.log("Uploaded Successfully!", data.Location);
    } catch (err) {
        console.error("Error uploading file: ", err);
    }
    main();
};

const listFilesByRegex = async () => {
    const answer = await inquirer.prompt({
        type: "input",
        name: "regex",
        message: "Enter a regex to filter the files: ",
    });

    const regex = new RegExp(answer.regex);
    const params = {
        Bucket: process.env.S3_BUCKET,
    };

    try {
        const data = await s3.listObjects(params).promise();
        const list = data.Contents.filter((file) => regex.test(file.Key)).map((file) => file.Key);

        console.log("Listing files by regex: ", list);
    } catch (err) {
        console.error("Error listing files by regex: ", err);
    }
    main();
};

const deleteFilesByRegex = async () => {
    const answer = await inquirer.prompt({
        type: "input",
        name: "regex",
        message: "Enter a regex to delete matching files: ",
    });

    const regex = new RegExp(answer.regex);
    const params = {
        Bucket: process.env.S3_BUCKET,
    };

    try {
        const data = await s3.listObjects(params).promise();
        const filesToDelete = data.Contents.filter((file) => regex.test(file.Key));

        for (let file of filesToDelete) {
            await s3.deleteObject({ Bucket: process.env.S3_BUCKET, Key: file.Key }).promise();
            console.log(`Deleted ${file.Key}`);
        }
    } catch (err) {
        console.error("Error deleting files by regex: ", err);
    }
    main();
};

main();
