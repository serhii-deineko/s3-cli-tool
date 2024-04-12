import dotenv from "dotenv";
import AWS from "aws-sdk";
import inquirer from "inquirer";

dotenv.config();

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
AWS.config.logger = null;

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

    switch (answer.action) {
        case "List all files":
            listFiles();
            break;
        case "Upload a file":
            uploadFile();
            break;
        case "List files by regex":
            listFilesByRegex();
            break;
        case "Delete files by regex":
            deleteFilesByRegex();
            break;
        case "Exit":
            process.exit();
    }
};

const listFiles = async () => {
    const params = {
        Bucket: process.env.S3_BUCKET,
    };
    s3.listObjects(params, (err, data) => {
        if (err) console.log(err);
        else {
            console.log(data?.Contents?.map((file) => file.Key));
            main();
        }
    });
};

const uploadFile = async () => {
    const answer = await inquirer.prompt([
        {
            type: "input",
            name: "filePath",
            message: "Enter path to the local file:",
        },
        {
            type: "input",
            name: "targetKey",
            message: "Enter the target file key (including folder path):",
        },
    ]);

    const fileContent = require("fs").readFileSync(answer.filePath);
    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: answer.targetKey,
        Body: fileContent,
    };

    s3.upload(params, (err, data) => {
        if (err) console.log(err);
        else {
            console.log("File uploaded successfully.", data.Location);
            main();
        }
    });
};

const listFilesByRegex = async () => {
    const answer = await inquirer.prompt({
        type: "input",
        name: "regex",
        message: "Enter a regex to filter the files:",
    });

    const regex = new RegExp(answer.regex);
    const params = {
        Bucket: process.env.S3_BUCKET,
    };

    s3.listObjects(params, (err, data) => {
        if (err) console.log(err);
        else {
            console.log(data.Contents.filter((file) => regex.test(file.Key)).map((file) => file.Key));
            main();
        }
    });
};

const deleteFilesByRegex = async () => {
    const answer = await inquirer.prompt({
        type: "input",
        name: "regex",
        message: "Enter a regex to delete matching files:",
    });

    const regex = new RegExp(answer.regex);
    const params = {
        Bucket: process.env.S3_BUCKET,
    };

    s3.listObjects(params, async (err, data) => {
        if (err) console.log(err);
        else {
            const filesToDelete = data.Contents.filter((file) => regex.test(file.Key));
            for (let file of filesToDelete) {
                await s3.deleteObject({ Bucket: process.env.S3_BUCKET, Key: file.Key }).promise();
                console.log(`Deleted ${file.Key}`);
            }
            main();
        }
    });
};

main();
